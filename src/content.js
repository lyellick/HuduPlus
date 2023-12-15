(async function () {
    await readLocalStorage('options').then(async (options) => {
        enableKBTreeView(options.kbTreeView);
        enableKBClipboardUpload(options.kbPasteUploadInsert);
    }).catch(async (error) => {});
})();