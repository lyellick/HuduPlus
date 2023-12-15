async function readLocalStorage(key) {
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

async function writeLocalStorage(key, value) {
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

async function clearLocalStorage(key) {
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
