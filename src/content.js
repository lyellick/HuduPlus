const readLocalStorage = async (key) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (result) {
            if (result[key] === undefined) {
                reject(`Key "${key}" not found in local storage`);
            } else {
                resolve(result[key]);
            }
        });
    });
};

const writeLocalStorage = async (key, value) => {
    return new Promise((resolve, reject) => {
        const data = {};
        data[key] = value;

        chrome.storage.local.set(data, function () {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
};

const clearLocalStorage = async (key) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.remove([key], function () {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
};

(async function () {
    await readLocalStorage('options').then(async (options) => {
        if (options.kbTreeView) {
            const params = new URLSearchParams(window.location.search);
            const companyIdParam = params.get('company_id');
            const folderParam = params.get('folder');

            if (companyIdParam && folderParam === null && location.pathname === "/kba") {
                await showTree(companyIdParam);
            }
        }

        if (options.kbPasteUploadInsert) {
            document.getElementById("mytextarea_ifr").contentDocument.body.addEventListener("paste", async function (e) {

                var items = (e.clipboardData || e.originalEvent.clipboardData).items;

                for (var i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        var ext = items[i].type.split("/")[1];
                        var blob = items[i].getAsFile();

                        var key = await readLocalStorage('key').then(async (key) => {
                            return key;
                        }).catch(async (error) => { });
        
                        var article = await fetchApiData(`/api/v1/articles?slug=${location.pathname.split("/")[2]}`, key).then(article => {
                            return article;
                        });
        
                        const formData = new FormData();
                        // formData.append("record_type", article[0].object_type);
                        // formData.append("record_id", article[0].id);
                        formData.append('file', blob, `${Date.now()}.${ext}`); 
                        fetch(`/public_photos?record_type=${article[0].object_type}&record_id=${article[0].id}`, {
                            method: 'POST',
                            body: formData,
                            headers: {
                                "x-api-key": key
                            }
                        }).then(r => {
                            return r.json();
                        }).then(data => {
                            var image = data.location;
                            var id = parseInt(image.split("/").slice(-1));
                            var img = document.getElementById("mytextarea_ifr").contentDocument.body.querySelector(`[src='/public_photo/${id - 1}']`);
                            img.setAttribute("src", image);
                            img.setAttribute("data-mce-src", image);
                        }).catch((error) => {
                            console.error("Error:", error);
                        });
                        
                        break;
                    }
                }

                
            });
        } else {
            // document.getElementById("mytextarea_ifr").contentDocument.body.removeEventListener("paste", getEventListeners(document.getElementById("mytextarea_ifr")).paste[0]);
        }
    }).catch(async (error) => {

    });
})();

function getFilenameFromBase64(base64String) {
    // Check if it's a data URL
    if (base64String.startsWith('data:')) {
        // Extract the media type and the base64 data
        const [metadata, data] = base64String.split(',');

        // Extract the file extension from the media type
        const extension = metadata.split(';')[0].split(':')[1].split('/')[1];

        // Create a unique filename using, for example, a timestamp
        const filename = `${Date.now()}.${extension}`;

        return filename;
    }

    // If not a data URL, you might need to handle it differently based on your specific case
    return 'unknown_filename.txt';
}

function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function retrieveImageFromClipboardAsBase64(pasteEvent, callback, imageFormat) {
    if (pasteEvent.clipboardData == false) {
        if (typeof (callback) == "function") {
            callback(undefined);
        }
    };

    // retrive elements from clipboard
    var items = pasteEvent.clipboardData.items;

    if (items == undefined) {
        if (typeof (callback) == "function") {
            callback(undefined);
        }
    };
    // loop the elements
    for (var i = 0; i < items.length; i++) {
        // Skip content if not image
        if (items[i].type.indexOf("image") == -1) continue;
        // Retrieve image on clipboard as blob
        var blob = items[i].getAsFile();

        // Create an abstract canvas and get context
        var mycanvas = document.createElement("canvas");
        var ctx = mycanvas.getContext('2d');

        // Create an image
        var img = new Image();

        // Once the image loads, render the img on the canvas
        img.onload = function () {
            // Update dimensions of the canvas with the dimensions of the image
            mycanvas.width = this.width;
            mycanvas.height = this.height;

            // Draw the image
            ctx.drawImage(img, 0, 0);

            // Execute callback with the base64 URI of the image
            if (typeof (callback) == "function") {
                callback(mycanvas.toDataURL(
                    (imageFormat || "image/png")
                ));
            }
        };

        // Crossbrowser support for URL
        var URLObj = window.URL || window.webkitURL;

        // Creates a DOMString containing a URL representing the object given in the parameter
        // namely the original Blob
        img.src = URLObj.createObjectURL(blob);
    }
}

function base64ToBlob(base64String) {
    base64String = base64String.split("data:image/png;base64,")[1]
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray]);
}

async function showTree(companyIdParam) {

    const companyId = parseInt(companyIdParam);

    var articles;
    var folders;



    await readLocalStorage('key').then(async (key) => {
        await fetchApiData(`/api/v1/articles?company_id=${companyId}`, key).then(data => {
            articles = data;
        });

        await fetchApiData(`/api/v1/folders?company_id=${companyId}`, key).then(data => {
            folders = data;
        });
    }).catch(async (error) => {

    });

    const tree = await buildTree(folders, articles);

    if (tree !== undefined) {
        document.getElementsByClassName("index__folders")[0].innerHTML = "";

        tree.forEach(rootNode => {
            walkData(rootNode);
        });
    } else {
        console.log("Hudu+: Bad API Key.");
        await chrome.storage.local.remove('hudu');
    }
}

function fetchApiData(url, key) {
    return fetch(url, { headers: { "x-api-key": key } })
        .then(response => response.json())
        .then(data => data.articles || data.folders || [])
        .catch(error => {
            console.error('Error fetching data:', error);
            return []; // Return an empty array or handle the error as needed
        });
}

async function buildTree(data, articles, parentId = null) {
    if (data.length > 0) {
        const folders = data.filter(item => item.parent_folder_id === parentId);

        const folderPromises = folders.map(async folder => {
            const children = await buildTree(data, articles, folder.id);
            const found = articles.filter(item => item.folder_id === folder.id);

            folder.children = children || [];
            folder.articles = found || [];

            return folder;
        });

        return Promise.all(folderPromises);
    }

    // Return a resolved promise with an empty array if there are no folders
    return Promise.resolve([]);
}

function walkData(node, level = 0) {
    document.getElementsByClassName("index__folders")[0].innerHTML += `<a style="margin-left: ${level}rem;" href="/kba?company_id=${node.company_id}&amp;folder=${node.id}" class="index__folder"><h1><i class="fas fa-folder"></i>${node.name}</h1> <p>${node.description}</p></a>`;

    if (node.articles.length > 0) {
        node.articles.forEach(article => {
            document.getElementsByClassName("index__folders")[0].innerHTML += `<a style="margin-left: ${level + 1}rem;" href="${article.url}" class="index__folder"><h1>${article.name}</h1></a>`;
        });
    }

    if (node.children.length > 0) {
        node.children.forEach(child => {
            walkData(child, level + 1);
        });
    }
}