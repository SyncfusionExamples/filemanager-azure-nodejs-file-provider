# filemanager-azure-NodeJs-file-provider

This repository contains the node JS Azure blob storage file system providers for the Syncfusion File Manager component.

## Key Features

The Node.js file provider module allows you to work with the azure blob storage. It also provides the methods for performing various file actions like creating a new folder, renaming files, and deleting files.

NodeJS File Provider serves the file system providers support for the  File Manager component with the NodeJS.

The following actions can be performed with NodeJS file system provider.

| **Actions** | **Description** |
| --- | --- |
| Read      | Reads the files from NodeJS file system. |
| Details   | Gets the file's details which consists of Type, Size, Location and Modified date. |
| Download  | Downloads the selected file or folder from NodeJS file system. |
| Upload    | Uploads a file in NodeJS file system. It accepts uploaded media with the following characteristics: <ul><li>Maximum file size:  30MB</li><li>Accepted Media MIME types: `*/*` </li></ul> |
| Create    | Creates a New folder. |
| Delete    | Deletes a folder or file. |
| Copy      | Copys the selected files or folders from target. |
| Move      | Moves the files or folders to the desired location. |
| Rename    | Renames a folder or file. |
| Search    | Full-text questions perform linguistic searches against text data in full-text indexes by operating on words and phrases. |

## How to configure a web service

Follow the below set of commands to configure the NodeJS file system providers. 

- To install ej2-filemanager-node-filesystem package, use the following command.

```sh
 
  npm install @syncfusion/filemanager-azure-NodeJs-file-provider

```

- To install the depend packages for the file system provider, navigate to @syncfusion/ej2-filemanager-node-filesystem folder within the node_modules and run the below command 

```sh
 
  npm install

```

### Start the service

To start the service use this command,

```sh
node filesystem-server.js
```

## File Manager AjaxSettings

To access the basic actions like Read, Delete, Copy, Move, Rename, Search, and Get Details of File Manager using NodeJS file system service, just map the following code snippet in the Ajaxsettings property of File Manager.

Here, the `hostUrl` will be your locally hosted port number.

```
  var hostUrl = http://localhost:3000/;
        ajaxSettings: {
            url: hostUrl,
        }
```

## File download AjaxSettings

To perform download operation, initialize the `downloadUrl` property in ajaxSettings of the File Manager component.

```
  var hostUrl = http://localhost:3000/;
  ajaxSettings: {
            url: hostUrl,
            downloadUrl: hostUrl + 'Download'
        },
```

## File upload AjaxSettings

To perform upload operation, initialize the `uploadUrl` property in ajaxSettings of the File Manager component.

```
  var hostUrl = http://localhost:3000/;
  ajaxSettings: {
            url: hostUrl,
            uploadUrl: hostUrl + 'Upload'
        },
```

## File image preview AjaxSettings

To perform image preview support in the File Manager component, initialize the `getImageUrl` property in ajaxSettings of the File Manager component.

```
  var hostUrl = http://localhost:3000/;
  ajaxSettings: {
            url: hostUrl,
            getImageUrl: hostUrl + 'GetImage'
        },
```

The File Manager will be rendered as follows.

![File Manager](https://ej2.syncfusion.com/products/images/file-manager/readme.gif)

## Support

Product support is available for through following mediums.

* Creating incident in Syncfusion [Direct-trac](https://www.syncfusion.com/support/directtrac/incidents?utm_source=npm&utm_campaign=filemanager) support system or [Community forum](https://www.syncfusion.com/forums/essential-js2?utm_source=npm&utm_campaign=filemanager).
* New [GitHub issue](https://github.com/syncfusion/ej2-javascript-ui-controls/issues/new).
* Ask your query in [Stack Overflow](https://stackoverflow.com/?utm_source=npm&utm_campaign=filemanager) with tag `syncfusion` and `ej2`.

## License

Check the license detail [here](https://github.com/syncfusion/ej2-javascript-ui-controls/blob/master/license).

## Changelog

Check the changelog [here](https://github.com/syncfusion/ej2-javascript-ui-controls/blob/master/controls/filemanager/CHANGELOG.md)

© Copyright 2020 Syncfusion, Inc. All Rights Reserved. The Syncfusion Essential Studio license and copyright applies to this distribution.