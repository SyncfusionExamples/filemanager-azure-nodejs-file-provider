const azure = require('azure-storage');
const { BlobServiceClient } = require("@azure/storage-blob");
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const archiver = require('archiver');
const multer = require('multer');
const app = express();
const port = 3000;
const cors = require('cors');
app.use(cors());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

const accountName = "ej2azureblobstorage";
const accountKey = "<-Your account key->";
const blobService = azure.createBlobService(accountName, accountKey);
const containerName = 'files';
const blobName = 'Files';
let prefix = 'Files/';
const delimiter = "/";
const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

async function getDateModified(directoryPath) {
    let lastUpdated = null;
    // for await (const item of containerClient.listBlobsFlat({ prefix: directoryPath })) {
    //     const checkFileModified = item.properties.lastModified;
    //     if (lastUpdated === null || lastUpdated < checkFileModified) {
    //         lastUpdated = checkFileModified;
    //     }
    // }
    return lastUpdated;
}

async function hasChildren(directoryPath) {
    //   for await (const item of containerClient.listBlobsByHierarchy('/', { prefix: directoryPath })) {
    //     if (item.kind === 'prefix') {
    //         return true;
    //       }
    //     }
    return false;
}

async function getFiles(req, res) {
    // Get the array of directories and files.
    let entry = {};
    const directoriesAndFiles = [];

    for await (const item of containerClient.listBlobsByHierarchy('/', { prefix: blobName + req.body.path })) {
        if (item.kind === 'prefix') {
            entry = {};
            entry.name = path.basename(item.name);
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
            entry.name = path.basename(item.name);
            entry.type = path.extname(item.name);
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
                const blobClient = containerClient.getBlobClient(blobName + req.body.path + req.body.names[i]);
                const properties = await blobClient.getProperties()
                const fileData = {
                    dateCreated: properties.createdOn,
                    dateModified: properties.lastModified,
                    filterPath: req.body.data[i].filterPath,
                    hasChild: false,
                    isFile: true,
                    name: path.basename(blobClient.name),
                    size: properties.contentLength,
                    type: path.extname(blobClient.name)
                }
                totalFiles.push(fileData);
                await blobClient.delete();
            }
            else {
                for await (const blob of containerClient.listBlobsFlat({ prefix: blobName + req.body.path + req.body.names[i] + '/' })) {
                    const fileData = {
                        dateCreated: blob.properties.createdOn,
                        dateModified: blob.propertieslastModified,
                        filterPath: req.body.data[i].filterPath,
                        hasChild: await hasChildren(blob.name),
                        isFile: true,
                        name: path.basename(blob.name),
                        size: blob.properties.contentLength,
                        type: path.extname(blob.name)
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
            for await (const blob of containerClient.listBlobsFlat({ prefix: blobName + req.body.path })) {
                size += blob.properties.contentLength;
                if (lastUpdated === null || lastUpdated < blob.properties.lastModified) {
                    lastUpdated = blob.properties.lastModified;
                }
            }
            const fileDetails = {
                name: req.body.names[0],
                location: blobName + req.body.path,
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
                    const blobClient = containerClient.getBlobClient(blobName + req.body.path + item);
                    const properties = await blobClient.getProperties();
                    names.push(path.basename(blobClient.name));
                    // Replace the blobClient.name to get the common loaction for more thatn one files
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
                    for await (const blob of containerClient.listBlobsFlat({ prefix: blobName + req.body.path + item + '/' })) {
                        size += (blob.properties.contentLength);
                        if (lastUpdated === null || lastUpdated < blob.properties.lastModified) {
                            lastUpdated = blob.properties.lastModified;
                        }
                    }
                    names.push(item);
                    if (req.body.names.length > 1) {
                        location = (blobName + req.body.path + item).replace("/" + item, "");
                    } else {
                        location = blobName + req.body.path + item;
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
    for await (const { } of containerClient.listBlobsFlat({ prefix: blobName + req.body.path + req.body.name + '/' })) {
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
        const folderName = blobName + req.body.path + req.body.name + "/about.txt";
        const blockBlobClient = containerClient.getBlockBlobClient(folderName);
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

async function renameFile(req, res) {
    let response = {};
    var errorMsg;
    if (req.body.data[0].isFile) {

        const sourceBlobClient = containerClient.getBlockBlobClient(blobName + req.body.path + req.body.name);
        const targetBlobClient = containerClient.getBlockBlobClient(blobName + req.body.path + req.body.newName);
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
                    type: path.basename(targetBlobClient.name),
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
        // Check the existance of directory
        for await (const { } of containerClient.listBlobsFlat({ prefix: blobName + req.body.path + req.body.newName + '/' })) {
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
            for await (const blob of containerClient.listBlobsFlat({ prefix: blobName + req.body.path + req.body.name + '/' })) {
                const targetPath = blob.name.replace((blobName + req.body.path + req.body.name), (blobName + req.body.path + req.body.newName));
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
            // Here prevented the checking of existance, if the request is rename.
            if (!isRename) {
                // Check the existance of the target directory, using the blob is available or not in that path.
                // Here the prefix is "Files/Document/". that end '/' added for get the exact directory.
                // For example If this '/' is not added it wil take the "Files/Document" and "Files/Documents". 
                for await (const { } of containerClient.listBlobsFlat({ prefix: blobName + req.body.targetPath + item.name + '/' })) {
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
                for await (const blob of containerClient.listBlobsFlat({ prefix: blobName + req.body.path + item.name + "/" })) {
                    // Here replace the source path with empty string. if source path is "Files/Pictures/tom.png" the targetPath is "tom.png".
                    // Here "blobName = Files" and "req.body.path = /Pictures/".
                    const targetBlob = blob.name.replace((blobName + req.body.path), "");
                    const sourceBlobClient = containerClient.getBlockBlobClient(blob.name);
                    var destinationBlobClient = containerClient.getBlockBlobClient(blobName + req.body.targetPath + targetBlob);
                    if (isRename) {
                        // Change the target path if get rename request.
                        var rootTatgetPath = targetBlob.substring(0, targetBlob.indexOf("/"));
                        var targetSubPath = targetBlob.substring(targetBlob.indexOf("/"));
                        var newTargetPath;
                        var counter = 1;
                        while (true) {
                            newTargetPath = rootTatgetPath + "(" + counter + ")" + targetSubPath;
                            destinationBlobClient = containerClient.getBlockBlobClient(blobName + req.body.targetPath + newTargetPath);
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
                    // Delete the Source blob if the sction is "move".
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
            const sourceBlobClient = containerClient.getBlockBlobClient(blobName + req.body.path + item.name);
            var destinationBlobClient = containerClient.getBlockBlobClient(blobName + req.body.targetPath + item.name);
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
                    var fileExtension = path.extname(item.name);
                    var newFileName;
                    var counter = 1;
                    while (true) {
                        newFileName = fileNameWithoutExtension + "(" + counter + ")" + fileExtension;
                        destinationBlobClient = containerClient.getBlockBlobClient(blobName + req.body.targetPath + newFileName);
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
                    name: path.basename(destinationBlobClient.name),
                    size: properties.contentLength,
                    previousName: null,
                    dateModified: properties.lastModified,
                    dateCreated: properties.createdOn,
                    hasChild: false,
                    isFile: true,
                    type: path.extname(destinationBlobClient.name),
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

    await searchInFolder(containerClient, blobName + currentPath, directories);
    // Helper function to search in folders
    async function searchInFolder(container, prefix, directory) {
        for await (const item of container.listBlobsByHierarchy("/", { prefix })) {
            if (item.kind === 'prefix') {
                // console.log("Folder-out ---> " + path.basename(item.name))
                if (path.basename(item.name).toLowerCase().includes(searchString.toLowerCase())) {
                    console.log("Folder ---> " + item.name);
                    entry = {};
                    entry.name = path.basename(item.name);
                    entry.type = "Directory";
                    entry.isFile = false;
                    entry.size = 0;
                    entry.hasChild = true;
                    entry.filterPath = currentPath;
                    entry.dateModified = await getDateModified(item.name);
                    directory.push(entry);
                }
                await searchInFolder(container, item.name, directory);
            } else {
                // console.log("File-out ---> " + path.basename(item.name));
                if (path.basename(item.name).toLowerCase().includes(searchString.toLowerCase())) {
                    const filterPath = path.dirname(item.name).substring(blobName.length) + "/";
                    console.log(filterPath);
                    entry = {};
                    entry.name = path.basename(item.name);
                    entry.type = path.extname(item.name);
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
    Promise.all(directories).then((values) => {
        console.log(values);
    })
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
        await renameFile(req, res);
    }
    if (typeof req.body !== 'undefined' && req.body.action === 'copy') {
        await copyAndMoveFiles(req, res)
    }
    if (typeof req.body !== 'undefined' && req.body.action === 'move') {
        await copyAndMoveFiles(req, res)
    }
    if (typeof req.body !== 'undefined' && req.body.action === 'search') {
        await searchFiles(req, res)
    }
    if (typeof req.body !== 'undefined' && req.body.action === 'read') {
        let totalFiles = await getFiles(req, res);
        let cwdFiles = {};
        cwdFiles.name = req.body.data.length != 0 && req.body.data[0] != null ? req.body.data[0].name : blobName;
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
        const blobClient = containerClient.getBlobClient(blobName + req.query.path);
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
    let data = JSON.parse(req.body.downloadInput);
    let currentPath = data.path;
    if (currentPath.endsWith('/')) {
        currentPath = currentPath.slice(0, -1);
    }
    let downloadObj = JSON.parse(req.body.downloadInput);

    if (downloadObj.names.length === 1 && downloadObj.data[0].isFile) {
        // Get a reference to the file blob
        const blockBlobClient = containerClient.getBlockBlobClient(blobName + downloadObj.path + downloadObj.names[0]);
        console.log(downloadObj.names);
        // Download the file to a local destination
        const downloadResponse = await blockBlobClient.download(0);
        res.setHeader('Content-Disposition', `attachment; filename=${path.basename(blobName + downloadObj.path + downloadObj.names[0])}`);
        res.setHeader('Content-Type', downloadResponse.contentType);
        res.setHeader('Content-Length', downloadResponse.contentLength);

        // Stream the file directly to the response
        downloadResponse.readableStreamBody.pipe(res);
    } else {
        // let output = fs.createWriteStream('./Files.zip');
        const zipFileName = 'download.zip';
        res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
        res.setHeader('Content-Type', 'application/zip');
        const archive = archiver('zip', {
            gzip: true,
            zlib: { level: 9 } // Set compression level
        });

        archive.pipe(res);
        for (const name of downloadObj.names) {
            const file = currentPath + downloadObj.path + name;
            if (downloadObj.data.find((item) => item.name === name && !item.isFile)) {
                const directoryPath = currentPath + downloadObj.path + name;
                // Create a folder in the zip archive
                // archive.directory(directoryPath, name);
                await getArchieveFolder(directoryPath, name, containerClient, archive)
                async function getArchieveFolder(directoryPath, name) {
                    for await (const item of containerClient.listBlobsByHierarchy('/', { prefix: blobName + directoryPath + "/" })) {
                        if (item.kind === 'prefix') {
                            let currentPath1 = item.name;
                            if (currentPath1.endsWith('/')) {
                                currentPath1 = currentPath1.slice(0, -1);
                            }
                            let currentPath2 = path.basename(item.name)
                            // if(currentPath1.endsWith("ss")){
                            //       currentPath2= "Files/TEST Folder/"
                            // }
                            // console.log(currentPath2)
                            // archive.directory(currentPath1,currentPath2 ,{name: path.basename(item.name)});
                            await getArchieveFolder(currentPath1, path.basename(item.name), containerClient, archive)
                        }
                        else {
                            const blockBlobClient = containerClient.getBlockBlobClient(item.name);
                            const downloadResponse = await blockBlobClient.download(0);
                            const entryName = path.join(name, path.basename(item.name));
                            console.log(entryName);
                            // archive.file("", { name: "", })
                            archive.append(downloadResponse.readableStreamBody, { name: entryName });
                        }
                    }
                }
            } else {
                const blockBlobClient = containerClient.getBlockBlobClient(blobName + downloadObj.path + name);
                const downloadResponse = await blockBlobClient.download(0);
                const entryName = path.basename(blobName + downloadObj.path + name);
                archive.append(downloadResponse.readableStreamBody, { name: entryName });
            }
        }
        archive.finalize();
    }
});

//For store the file in bufffer
const multerConfig = {
    storage: multer.memoryStorage()
};

app.post('/Upload', multer(multerConfig).any("uploadFiles"), async function (req, res) {
    if (req.body != null && req.body.path != null) {
        if (req.body.action === 'save') {
            const blobClient = containerClient.getBlockBlobClient(blobName + req.body.path + req.body.filename);
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
            var fileExtension = path.extname(req.body.filename);
            var newFileName = '';
            var counter = 1;
            while (true) {
                newFileName = fileNameWithoutExtension + "(" + counter + ")" + fileExtension;
                const newBlobClient = containerClient.getBlockBlobClient(blobName + req.body.path + newFileName);
                if (!await newBlobClient.exists()) {
                    await newBlobClient.uploadData(req.files[0].buffer);
                    res.send('Success');
                    break;
                }
                counter++;
            }
        } else if (req.body.action === 'replace') {
            const blobClient = containerClient.getBlockBlobClient(blobName + req.body.path + req.body.filename);
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