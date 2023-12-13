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
    key = await readLocalStorage('hudu');

    if (key === "") {
        key = prompt("Hudu API Key", "");

        await chrome.storage.local.set({ hudu: key });
    }

    const params = new URLSearchParams(window.location.search);
    const companyIdParam = params.get('company_id');
    const folderParam = params.get('folder');

    if (companyIdParam && folderParam === null && location.pathname === "/kba") {
        await showTree(companyIdParam);
    }
})();

async function showTree(companyIdParam) {
    const companyId = parseInt(companyIdParam);

    const articles = await fetchApiData(`/api/v1/articles?company_id=${companyId}`);
    const folders = await fetchApiData(`/api/v1/folders?company_id=${companyId}`);

    const tree = buildTree(folders, articles);

    document.getElementsByClassName("index__folders")[0].innerHTML = "";

    tree.forEach(rootNode => {
        walkData(rootNode);
    });
}

async function fetchApiData(url) {
    const response = await fetch(url, { headers: { "x-api-key": key } });
    const data = await response.json();
    return data.articles || data.folders || [];
}

function buildTree(data, articles, parentId = null) {
    const folders = data.filter(item => item.parent_folder_id === parentId);

    return folders.map(folder => {
        const children = buildTree(data, articles, folder.id);
        const found = articles.filter(item => item.folder_id === folder.id);

        folder.children = children || [];
        folder.articles = found || [];

        return folder;
    });
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