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
    await readLocalStorage('options').then((options) => {
        document.getElementById('kb-tree-view').checked = options.kbTreeView;
    }).catch(async (error) => {
        await writeLocalStorage('options',  {});
    });

    await readLocalStorage('key').then((key) => {
        document.getElementById('hudu-api-key').value = key;
    }).catch(async (error) => {
        await writeLocalStorage('key',  '');
    });

    document.getElementById('save').addEventListener('click', async () => {
        var options = {
            'kbTreeView': document.getElementById('kb-tree-view').checked
        };
        var key = document.getElementById('hudu-api-key').value;
        await writeLocalStorage('key',  key);
        await writeLocalStorage('options', options);
    });
})();