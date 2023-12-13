var key = "";

const readLocalStorage = async (key) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (result) {
            if (result[key] === undefined) {
                reject();
            } else {
                resolve(result[key]);
            }
        });
    });
};

(async function () {
    // await chrome.storage.local.remove('hudu');
    try {
        key = await readLocalStorage('hudu');
    } catch {
        await chrome.storage.local.remove('hudu');
    }

    if (key === "") {
        key = prompt("Hudu API Key", "");
        if (key !== "") {
            await chrome.storage.local.set({ hudu: key });
        }
    }

    const params = new URLSearchParams(window.location.search);
    const companyIdParam = params.get('company_id');
    const folderParam = params.get('folder');

    if (companyIdParam && folderParam === null && key !== "" && location.pathname === "/kba") {
        await showTree(companyIdParam);
    } else {
        console.log("Hudu+: Unable to load API Key.");
        await chrome.storage.local.remove('hudu');
    }
})();

async function showTree(companyIdParam) {

    const companyId = parseInt(companyIdParam);

    await fetchApiData(`/api/v1/articles?company_id=${companyId}`).then(data => {
        articles = data;
    });
    
    await fetchApiData(`/api/v1/folders?company_id=${companyId}`).then(data => {
        folders = data;
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

function fetchApiData(url) {
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