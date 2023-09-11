import { BlobServiceClient } from "@azure/storage-blob";
import express from 'express';
import bodyParser from 'body-parser';
const { urlencoded, json } = bodyParser;
import { basename, extname, dirname } from 'path';
import archiver from 'archiver';
import multer, { memoryStorage } from 'multer';
const app = express();
const port = 3000;
import cors from 'cors';
app.use(cors());
app.use(urlencoded({
    extended: true
}));
app.use(json());

const accountName = "<--Your Account Name-->"; // For Example: "ej2azureblobstorage"
const accountKey = "<--Your Account Key-->";
const EndpointSuffix = "<--Your Account Endpoint-->"; // For Example: "core.windows.net"
const containerName = 'files';
const directoryName = 'Files';
const endSlash = '/';
const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=${EndpointSuffix}`;
//For store the file in buffer objects
const multerConfig = {
    storage: memoryStorage()
};
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

async function getDateModified(directoryPath) {
    let lastUpdated = null;
    for await (const item of containerClient.listBlobsFlat({ prefix: directoryPath })) {
        const checkFileModified = item.properties.lastModified;
        if (lastUpdated === null || lastUpdated < checkFileModified) {
            lastUpdated = checkFileModified;
        }
    }
    return lastUpdated;
}

async function hasChildren(directoryPath) {
    for await (const item of containerClient.listBlobsByHierarchy('/', { prefix: directoryPath })) {
        if (item.kind === 'prefix') {
            return true;
        }
    }
    return false;
}

async function getFiles(req) {
    // Get the array of directories and files.
    let entry = {};
    const directoriesAndFiles = [];

    for await (const item of containerClient.listBlobsByHierarchy('/', { prefix: directoryName + req.body.path })) {
        if (item.kind === 'prefix') {
            entry = {};
            entry.name = basename(item.name);
            entry.type = "Directory";
            entry.isFile = false;
            entry.size = 0;
            entry.hasChild = await hasChildren(item.name);
            entry.filterPath = req.body.path;
            entry.dateModified = await getDateModified(item.name);
            directoriesAndFiles.push(entry);
        }
        else {
            entry = {};
            entry.name = basename(item.name);
            entry.type = extname(item.name);
            entry.isFile = true;
            entry.size = item.properties.contentLength;
            entry.dateModified = item.properties.lastModified;
            entry.hasChild = false;
            entry.filterPath = req.body.path;
            directoriesAndFiles.push(entry);
        }
    }
    return directoriesAndFiles;
}

async function deleteFoldersAndFiles(req, res) {
    try {
        let totalFiles = [];
        for (let i = 0; i < req.body.data.length; i++) {
            if (req.body.data[i].isFile) {
                const blobClient = containerClient.getBlobClient(directoryName + req.body.path + req.body.names[i]);
                const properties = await blobClient.getProperties()
                const fileData = {
                    dateCreated: properties.createdOn,
                    dateModified: properties.lastModified,
                    filterPath: req.body.data[i].filterPath,
                    hasChild: false,
                    isFile: true,
                    name: basename(blobClient.name),
                    size: properties.contentLength,
                    type: extname(blobClient.name)
                }
                totalFiles.push(fileData);
                await blobClient.delete();
            }
            else {
                for await (const blob of containerClient.listBlobsFlat({ prefix: directoryName + req.body.path + req.body.names[i] + endSlash })) {
                    const fileData = {
                        dateCreated: blob.properties.createdOn,
                        dateModified: blob.properties.lastModified,
                        filterPath: req.body.data[i].filterPath,
                        hasChild: await hasChildren(blob.name),
                        isFile: true,
                        name: basename(blob.name),
                        size: blob.properties.contentLength,
                        type: extname(blob.name)
                    }
                    totalFiles.push(fileData);
                    const blobClient = containerClient.getBlobClient(blob.name);
                    await blobClient.delete();
                }
            }
        }

        let response = { cwd: null, details: null, error: null, files: totalFiles };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    }
    catch (error) {
        var errorMsg = new Error();
        errorMsg.message = "file not found in given location.";
        errorMsg.code = "404";
        res.statusMessage = "File not found in given location.";
        response = { cwd: null, files: null, details: null, error: errorMsg };
        res.setHeader('Content-Type', 'application/json');
        res.json(response)
    }
}

async function getDetails(req, res) {
    try {
        //For empty details
        if (req.body.names.length == 0 && req.body.data != 0) {
            let lastUpdated = null;
            //Get the folder name from the data
            req.body.names = req.body.data.map(item => item.name);
            let size = 0;
            for await (const blob of containerClient.listBlobsFlat({ prefix: directoryName + req.body.path })) {
                size += blob.properties.contentLength;
                if (lastUpdated === null || lastUpdated < blob.properties.lastModified) {
                    lastUpdated = blob.properties.lastModified;
                }
            }
            const fileDetails = {
                name: req.body.names[0],
                location: directoryName + req.body.path,
                isFile: false,
                size: await byteConversion(size),
                created: null,
                modified: lastUpdated,
                multipleFiles: false
            }
            let response = {};
            response = { cwd: null, files: null, error: null, details: fileDetails };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response)
        } else {
            let fileDetails = {};
            let size = 0;
            let names = [];
            let location;
            let isFile = false;
            let created;
            let modified;
            for (const item of req.body.names) {
                if (req.body.data[0].isFile) {
                    const blobClient = containerClient.getBlobClient(directoryName + req.body.path + item);
                    const properties = await blobClient.getProperties();
                    names.push(basename(blobClient.name));
                    // Replace the blobClient.name to get the common location for more than one files
                    if (req.body.names.length > 1) {
                        location = blobClient.name.replace("/" + item, "");
                    } else {
                        location = blobClient.name;
                        created = properties.createdOn;
                        modified = properties.lastModified;
                        isFile = true;
                    }
                    size += properties.contentLength;
                } else {
                    let lastUpdated = null;
                    for await (const blob of containerClient.listBlobsFlat({ prefix: directoryName + req.body.path + item + endSlash })) {
                        size += (blob.properties.contentLength);
                        if (lastUpdated === null || lastUpdated < blob.properties.lastModified) {
                            lastUpdated = blob.properties.lastModified;
                        }
                    }
                    names.push(item);
                    if (req.body.names.length > 1) {
                        location = (directoryName + req.body.path + item).replace("/" + item, "");
                    } else {
                        location = directoryName + req.body.path + item;
                        modified = lastUpdated;
                        isFile = false;
                    }

                }
            }
            fileDetails = {
                name: names.join(", "),
                location: location,
                isFile: isFile,
                size: await byteConversion(size),
                created: created,
                modified: modified,
                multipleFiles: req.body.names.length > 1
            };
            let response = { cwd: null, files: null, error: null, details: fileDetails };
            response = JSON.stringify(response);
            res.setHeader('Content-Type', 'application/json');
            res.json(response)
        }
    }
    catch (error) {
        var errorMsg = new Error();
        errorMsg.message = "file not found in given location.";
        errorMsg.code = "404";
        res.statusMessage = "File not found in given location.";
        response = { cwd: null, files: null, details: null, error: errorMsg };
        res.setHeader('Content-Type', 'application/json');
        res.json(response)
    }
}

async function createFolder(req, res) {
    var response;
    var isExist = false;
    for await (const { } of containerClient.listBlobsFlat({ prefix: directoryName + req.body.path + req.body.name + endSlash })) {
        isExist = true;
        break;
    }
    if (isExist) {
        var errorMsg = new Error();
        errorMsg.message = "File Already Exists.";
        errorMsg.code = "400";
        errorMsg.fileExists = req.body.name;
        res.statusMessage = "File Already Exists.";
        response = { cwd: null, files: null, details: null, error: errorMsg };
    } else {
        // Create a new folder with about.txt file
        const fileName = directoryName + req.body.path + req.body.name + "/about.txt";
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        const fileContent = "This is the content of the about.txt file.";
        // Upload the about.txt to new folder.
        await blockBlobClient.uploadData(Buffer.from(fileContent), {
            blobHTTPHeaders: { blobContentType: "text/plain" },
        });
        const properties = await blockBlobClient.getProperties();
        const data = [{
            dateCreated: properties.createdOn,
            dateModified: properties.lastModified,
            filterPath: null,
            hasChild: false,
            isFile: false,
            name: req.body.name,
            size: 0,
            type: "Directory"
        }];
        response = { cwd: null, files: data, details: null, error: null };
    }
    response = JSON.stringify(response);
    res.setHeader('Content-Type', 'application/json');
    res.json(response);
}

async function rename(req, res) {
    let response = {};
    var errorMsg;
    if (req.body.data[0].isFile) {

        const sourceBlobClient = containerClient.getBlockBlobClient(directoryName + req.body.path + req.body.name);
        const targetBlobClient = containerClient.getBlockBlobClient(directoryName + req.body.path + req.body.newName);
        if (!await targetBlobClient.exists()) {
            // Copy the source file to the target file
            await targetBlobClient.beginCopyFromURL(sourceBlobClient.url);
            // Delete the source file
            await sourceBlobClient.delete();
            const properties = await targetBlobClient.getProperties();
            const files = [
                {
                    name: targetBlobClient.name,
                    size: properties.contentLength,
                    dateModified: properties.lastModified,
                    dateCreated: properties.createdOn,
                    hasChild: false,
                    isFile: true,
                    type: basename(targetBlobClient.name),
                    filterPath: req.body.path
                }
            ];

            response = { cwd: null, files: files, error: null, details: null };
            response = JSON.stringify(response);
        }
        else {
            errorMsg = new Error();
            errorMsg.message = "File Already Exists.";
            errorMsg.code = "400";
            errorMsg.fileExists = req.body.newName;
            response = { cwd: null, files: null, error: errorMsg, details: null };
            response = JSON.stringify(response);
            res.statusMessage = "File Already Exists.";

        }
    }
    else {
        var isExist = false;
        // Check the existence of directory
        for await (const { } of containerClient.listBlobsFlat({ prefix: directoryName + req.body.path + req.body.newName + endSlash })) {
            isExist = true;
            break;
        }
        if (isExist) {
            errorMsg = new Error();
            errorMsg.message = "File Already Exists.";
            errorMsg.code = "400";
            errorMsg.fileExists = req.body.newName;
            response = { cwd: null, files: null, error: errorMsg, details: null };
            response = JSON.stringify(response);
            res.statusMessage = "File Already Exists.";
        }
        else {
            for await (const blob of containerClient.listBlobsFlat({ prefix: directoryName + req.body.path + req.body.name + endSlash })) {
                const targetPath = blob.name.replace((directoryName + req.body.path + req.body.name), (directoryName + req.body.path + req.body.newName));
                const sourceBlobClient = containerClient.getBlockBlobClient(blob.name);
                const targetBlobClient = containerClient.getBlockBlobClient(targetPath);
                await targetBlobClient.beginCopyFromURL(sourceBlobClient.url);
                await sourceBlobClient.delete();
            }
            const files = [
                {
                    name: req.body.newName,
                    size: 0,
                    dateModified: null,
                    dateCreated: null,
                    hasChild: false,
                    isFile: false,
                    type: "Directory",
                    filterPath: req.body.path
                }
            ];
            response = { cwd: null, files: files, error: null, details: null };
            response = JSON.stringify(response);
        }
    }
    res.setHeader('Content-Type', 'application/json');
    res.json(response);
}

async function copyAndMoveFiles(req, res) {
    const files = [];
    let response = {};
    var errorMsg;
    var renameFiles = [];
    var isRename = req.body.renameFiles.length > 0;
    for (const item of req.body.data) {
        if (item.type == "Directory") {
            var isExist = false;
            // Here prevented the checking of existence, if the request is rename.
            if (!isRename) {
                // Check the existence of the target directory, using the blob is available or not in that path.
                // Here the prefix is "Files/Document/". that end '/' added for get the exact directory.
                // For example If this '/' is not added it wil take the "Files/Document" and "Files/Documents". 
                for await (const { } of containerClient.listBlobsFlat({ prefix: directoryName + req.body.targetPath + item.name + endSlash })) {
                    isExist = true;
                    break;
                }
                if (isExist) {
                    errorMsg = new Error();
                    errorMsg.message = "File Already Exists.";
                    errorMsg.code = "400";
                    renameFiles.push(item.name);
                    errorMsg.fileExists = renameFiles;
                    res.statusMessage = "File Already Exists.";

                }
            }
            if (!isExist) {
                var newDirectoryName = item.name;
                for await (const blob of containerClient.listBlobsFlat({ prefix: directoryName + req.body.path + item.name + endSlash })) {
                    // Here replace the source path with empty string. if source path is "Files/Pictures/tom.png" the targetPath is "tom.png".
                    // Here "directoryName = Files" and "req.body.path = /Pictures/".
                    const targetBlob = blob.name.replace((directoryName + req.body.path), "");
                    const sourceBlobClient = containerClient.getBlockBlobClient(blob.name);
                    var destinationBlobClient = containerClient.getBlockBlobClient(directoryName + req.body.targetPath + targetBlob);
                    if (isRename) {
                        // Change the target path if get rename request.
                        var rootTargetPath = targetBlob.substring(0, targetBlob.indexOf("/"));
                        var targetSubPath = targetBlob.substring(targetBlob.indexOf("/"));
                        var newTargetPath;
                        var counter = 1;
                        while (true) {
                            newTargetPath = rootTargetPath + "(" + counter + ")" + targetSubPath;
                            destinationBlobClient = containerClient.getBlockBlobClient(directoryName + req.body.targetPath + newTargetPath);
                            if (!await destinationBlobClient.exists()) {
                                newDirectoryName = item.name + "(" + counter + ")";
                                await destinationBlobClient.beginCopyFromURL(sourceBlobClient.url);
                                break;
                            }
                            counter++;
                        }

                    } else {
                        await destinationBlobClient.beginCopyFromURL(sourceBlobClient.url);
                    }
                    // Delete the Source blob if the action is "move".
                    if (req.body.action == "move") {
                        await sourceBlobClient.delete();
                    }
                }
                const data = {
                    name: newDirectoryName,
                    size: 0,
                    hasChild: false,
                    isFile: false,
                    type: item.type,
                    filterPath: req.body.targetPath
                };
                files.push(data)
            }
        }
        else {
            var isExist = false;
            const sourceBlobClient = containerClient.getBlockBlobClient(directoryName + req.body.path + item.name);
            var destinationBlobClient = containerClient.getBlockBlobClient(directoryName + req.body.targetPath + item.name);
            if (!isRename) {
                if (await destinationBlobClient.exists()) {
                    isExist = true
                    errorMsg = new Error();
                    errorMsg.message = "File Already Exists.";
                    errorMsg.code = "400";
                    renameFiles.push(item.name);
                    errorMsg.fileExists = renameFiles;
                    res.statusMessage = "File Already Exists.";

                }
            }
            if (!isExist) {
                if (isRename) {
                    var fileNameWithoutExtension = item.name.substring(0, item.name.lastIndexOf('.'));
                    var fileExtension = extname(item.name);
                    var newFileName;
                    var counter = 1;
                    while (true) {
                        newFileName = fileNameWithoutExtension + "(" + counter + ")" + fileExtension;
                        destinationBlobClient = containerClient.getBlockBlobClient(directoryName + req.body.targetPath + newFileName);
                        if (!await destinationBlobClient.exists()) {
                            await destinationBlobClient.beginCopyFromURL(sourceBlobClient.url);
                            break;
                        }
                        counter++;
                    }

                } else {
                    await destinationBlobClient.beginCopyFromURL(sourceBlobClient.url);
                }
                if (req.body.action == "move") {
                    await sourceBlobClient.delete();
                }
                const properties = await destinationBlobClient.getProperties();

                const data = {
                    name: basename(destinationBlobClient.name),
                    size: properties.contentLength,
                    previousName: null,
                    dateModified: properties.lastModified,
                    dateCreated: properties.createdOn,
                    hasChild: false,
                    isFile: true,
                    type: extname(destinationBlobClient.name),
                    filterPath: req.body.targetPath
                };
                files.push(data)
            }
        }
    }
    response = { cwd: null, files: files, error: errorMsg, details: null };
    response = JSON.stringify(response);
    res.setHeader('Content-Type', 'application/json');
    res.json(response);
}


async function searchFiles(req, res) {
    var currentPath = req.body.path;
    var searchString = req.body.searchString.replace(/\*/g, "");

    const directories = [];

    await searchInFolder(directoryName + currentPath, directories);
    // Helper function to search in folders
    async function searchInFolder(prefix, directory) {
        for await (const item of containerClient.listBlobsByHierarchy("/", { prefix })) {
            if (item.kind === 'prefix') {
                if (basename(item.name).toLowerCase().includes(searchString.toLowerCase())) {
                    entry = {};
                    entry.name = basename(item.name);
                    entry.type = "Directory";
                    entry.isFile = false;
                    entry.size = 0;
                    entry.hasChild = true;
                    entry.filterPath = (dirname(item.name)).replace(directoryName, "");
                    entry.dateModified = await getDateModified(item.name);
                    directory.push(entry);
                }
                await searchInFolder(item.name, directory);
            } else {
                if (basename(item.name).toLowerCase().includes(searchString.toLowerCase())) {
                    const filterPath = dirname(item.name).substring(directoryName.length) + endSlash;
                    entry = {};
                    entry.name = basename(item.name);
                    entry.type = extname(item.name);
                    entry.isFile = true;
                    entry.size = item.properties.contentLength;
                    entry.dateModified = item.properties.lastModified;
                    entry.hasChild = false;
                    entry.filterPath = filterPath;
                    directory.push(entry);
                }
            }
        }
    }
    let response = {};
    response = { cwd: null, files: directories, error: null, details: null };
    response = JSON.stringify(response);
    res.setHeader('Content-Type', 'application/json');
    res.json(response);
}

async function byteConversion(fileSize) {
    try {
        const index = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];
        if (fileSize === 0) {
            return "0 B";
        }
        const value = Math.floor(Math.log(Math.abs(fileSize)) / Math.log(1024));
        const result = (Math.sign(fileSize) * Math.round(Math.abs(fileSize) / Math.pow(1024, value), 1)).toFixed(1);
        const output = result + " " + index[value];
        return output;
    } catch (error) {
        return 0;
    }
}

app.post('/', async function (req, res) {
    if (typeof req.body !== 'undefined' && req.body.action === 'delete') {
        await deleteFoldersAndFiles(req, res);
    }
    if (typeof req.body !== 'undefined' && req.body.action === 'details') {
        await getDetails(req, res);
    }
    if (typeof req.body !== 'undefined' && req.body.action === 'create') {
        await createFolder(req, res);
    }
    if (typeof req.body !== 'undefined' && req.body.action === 'rename') {
        await rename(req, res);
    }
    if (typeof req.body !== 'undefined' && (req.body.action === 'copy' || req.body.action === 'move')) {
        await copyAndMoveFiles(req, res)
    }
    if (typeof req.body !== 'undefined' && req.body.action === 'search') {
        await searchFiles(req, res)
    }
    if (typeof req.body !== 'undefined' && req.body.action === 'read') {
        let totalFiles = await getFiles(req);
        let cwdFiles = {};
        cwdFiles.name = req.body.data.length != 0 && req.body.data[0] != null ? req.body.data[0].name : directoryName;
        cwdFiles.type = "File Folder";
        cwdFiles.filterPath = req.body.data.length != 0 && req.body.data[0] != null ? req.body.data[0].filterPath : "";
        cwdFiles.size = 0;
        cwdFiles.hasChild = true;

        let response = {};
        response = { cwd: cwdFiles, files: totalFiles };
        response = JSON.stringify(response);
        res.setHeader('Content-Type', 'application/json');
        res.json(response);
    }
});

app.get('/GetImage', async function (req, res) {
    try {
        const blobClient = containerClient.getBlobClient(directoryName + req.query.path);
        // Download the image as a readable stream
        const downloadResponse = await blobClient.download();
        downloadResponse.readableStreamBody.pipe(res);
        res.writeHead(200, { 'Content-type': 'image/jpg' });
    }
    catch (error) {
        res.status(404).send(req.query.path + " not found in given location.");
    }

});

app.post('/Download', async function (req, res) {
    let downloadObj = JSON.parse(req.body.downloadInput);
    if (downloadObj.names.length === 1 && downloadObj.data[0].isFile) {
        // Get a reference to the file blob
        const blockBlobClient = containerClient.getBlockBlobClient(directoryName + downloadObj.path + downloadObj.names[0]);
        // Download the file to a local destination
        const downloadResponse = await blockBlobClient.download(0);
        res.setHeader('Content-Disposition', `attachment; filename=${downloadObj.names[0]}`);
        res.setHeader('Content-Type', downloadResponse.contentType);
        res.setHeader('Content-Length', downloadResponse.contentLength);

        // Stream the file directly to the response
        downloadResponse.readableStreamBody.pipe(res);
    } else {
        const zipFileName = downloadObj.names.length > 1 ? 'Files.zip' : `${downloadObj.names[0]}.zip`;
        res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
        res.setHeader('Content-Type', 'application/zip');
        const archive = archiver('zip', {
            gzip: true,
            zlib: { level: 9 }
        });

        archive.pipe(res);
        for (const name of downloadObj.names) {
            if (downloadObj.data.find((item) => item.name === name && !item.isFile)) {
                const directoryPath = directoryName + downloadObj.path + name + endSlash;
                await getAchieveFolder(directoryPath)
                async function getAchieveFolder(directoryPath) {
                    for await (const item of containerClient.listBlobsByHierarchy('/', { prefix: directoryPath })) {
                        if (item.kind === 'blob') {
                            const blockBlobClient = containerClient.getBlockBlobClient(item.name);
                            const downloadResponse = await blockBlobClient.download(0);
                            const entryName = item.name.replace((directoryName + downloadObj.path), "");
                            archive.append(downloadResponse.readableStreamBody, { name: entryName });
                        }
                        else {
                            await getAchieveFolder(item.name)
                        }
                    }
                }
            } else {
                const blockBlobClient = containerClient.getBlockBlobClient(directoryName + downloadObj.path + name);
                const downloadResponse = await blockBlobClient.download(0);
                const entryName = basename(directoryName + downloadObj.path + name);
                archive.append(downloadResponse.readableStreamBody, { name: entryName });
            }
        }
        archive.finalize();
    }
});

app.post('/Upload', multer(multerConfig).any("uploadFiles"), async function (req, res) {
    if (req.body != null && req.body.path != null) {
        if (req.body.action === 'save') {
            const blobClient = containerClient.getBlockBlobClient(directoryName + req.body.path + req.body.filename);
            if (!await blobClient.exists()) {
                await blobClient.uploadData(req.files[0].buffer);
                res.send('Success');
            }
            else {
                var errorMsg = new Error();
                errorMsg.message = "File Already Exists.";
                errorMsg.code = "400";
                errorMsg.fileExists = req.body.filename;
                var response = { error: errorMsg, files: [] };
                response = JSON.stringify(response);
                res.statusCode = 400;
                res.statusMessage = "File Already Exists.";
                res.setHeader('Content-Type', 'application/json');
                res.json(response);
            }
        } else if (req.body.action === 'keepboth') {
            var fileNameWithoutExtension = req.body.filename.substring(0, req.body.filename.lastIndexOf('.'));
            var fileExtension = extname(req.body.filename);
            var newFileName = '';
            var counter = 1;
            while (true) {
                newFileName = fileNameWithoutExtension + "(" + counter + ")" + fileExtension;
                const newBlobClient = containerClient.getBlockBlobClient(directoryName + req.body.path + newFileName);
                if (!await newBlobClient.exists()) {
                    await newBlobClient.uploadData(req.files[0].buffer);
                    res.send('Success');
                    break;
                }
                counter++;
            }
        } else if (req.body.action === 'replace') {
            const blobClient = containerClient.getBlockBlobClient(directoryName + req.body.path + req.body.filename);
            if (await blobClient.exists()) {
                await blobClient.uploadData(req.files[0].buffer);
                res.send('Success');
            }
        }
    }
});

app.listen(port, () => {
    console.log('Server started on port 3000');
});