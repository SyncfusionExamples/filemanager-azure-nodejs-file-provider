# filemanager-azure-NodeJS-file-provider

**Repository Description**  
This repository contains the **Node.js Azure Blob Storage file system provider** for the Syncfusion **Essential JS 2 File Manager** component.  
The provider enables the File Manager UI to perform file operations directly against **Azure Blob Storage** using a Node.js backend service.

It exposes server‑side APIs that allow secure interaction with blob containers for reading, uploading, downloading, and managing files and folders.

## Project Overview
The purpose of this project is to demonstrate how to integrate **Azure Blob Storage** with the Syncfusion JavaScript File Manager using a Node.js backend provider.  
It shows how client‑side File Manager requests are handled by a Node.js service that performs corresponding file system actions on Azure storage.

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

## Prerequisites
Ensure the following requirements are met before running this project:
- Node.js (LTS recommended)  
- npm package manager  
- Azure Storage account and Blob container  
- Basic knowledge of JavaScript and Node.js  
- Syncfusion Essential JS 2 File Manager setup  

## Installation

### Install the Azure Node.js File Provider
Install the Azure File Manager Node.js provider package using npm:
```bash
npm install @syncfusion/filemanager-azure-NodeJs-file-provider
```
### Install Provider Dependencies
Navigate to the provider directory inside node_modules and install required dependencies:
```bash
npm install
```
### Running the Service
Start the Node.js Azure file system service using:
```bash
node filesystem-server.js
```
By default, the service runs at:`http://localhost:3000/`

## Usage

### File Manager AjaxSettings
To access the basic actions like Read, Delete, Copy, Move, Rename, Search, and Get Details of File Manager using NodeJS file system service, just map the following code snippet in the Ajaxsettings property of File Manager.
Here, the `hostUrl` will be your locally hosted port number.
```
  var hostUrl = http://localhost:3000/;
        ajaxSettings: {
            url: hostUrl,
        }
```
### File download AjaxSettings
To perform download operation, initialize the `downloadUrl` property in ajaxSettings of the File Manager component.
```
  var hostUrl = http://localhost:3000/;
  ajaxSettings: {
            url: hostUrl,
            downloadUrl: hostUrl + 'Download'
        },
```
### File upload AjaxSettings
To perform upload operation, initialize the `uploadUrl` property in ajaxSettings of the File Manager component.
```
  var hostUrl = http://localhost:3000/;
  ajaxSettings: {
            url: hostUrl,
            uploadUrl: hostUrl + 'Upload'
        },
```
### File image preview AjaxSettings
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

## Documentation
- General Syncfusion documentation:
https://help.syncfusion.com/
- JavaScript Introduction (Essential JS 2):
https://ej2.syncfusion.com/javascript/documentation/introduction
- JavaScript File Manager – Getting Started (ES5):
https://ej2.syncfusion.com/javascript/documentation/file-manager/es5-getting-started

## Additional Resources
- Syncfusion JavaScript File Manager overview:
https://www.syncfusion.com/javascript-ui-controls/js-file-manager

## Troubleshooting
- Ensure the Node.js service is running and accessible.
- Verify Azure Blob Storage credentials and container configuration.
- Check that API endpoints are correctly mapped in ajaxSettings.
- Restart the service after configuration changes.

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