(async function () {
    var save;
    var key = await readLocalStorage('key').then((key) => {
        return key;
    }).catch(async (error) => {
        await writeLocalStorage('key', '');
    });

    var instance = await readLocalStorage('instance').then((instance) => {
        return instance;
    }).catch(async (error) => {
        await writeLocalStorage('instance', '');
    });

    await readLocalStorage('options').then((options) => {
        document.getElementById('kb-tree-view').checked = options.kbTreeView;
        document.getElementById('kb-paste-upload-insert').checked = options.kbPasteUploadInsert;
    }).catch(async (error) => {
        await writeLocalStorage('options', {});
    });

    document.getElementById('hudu-instance').value = instance;
    document.getElementById('hudu-api-key').value = key;

    document.getElementById("options").addEventListener('input', async function (evt) {
        document.getElementById('saving').classList.remove('d-none');
        clearTimeout(save);
        await writeLocalStorage('key', document.getElementById('hudu-api-key').value);
        await writeLocalStorage('instance', document.getElementById('hudu-instance').value);
        await writeLocalStorage('options', {
            'kbTreeView': document.getElementById('kb-tree-view').checked,
            'kbPasteUploadInsert': document.getElementById('kb-paste-upload-insert').checked,
        });
        save = setTimeout(function () { document.getElementById('saving').classList.add('d-none'); }, 1000);
    });

    let typingTimer;
    let doneTypingInterval = 1000;
    let searchCompanyInput = document.getElementById('company-name');

    searchCompanyInput.addEventListener('keyup', () => {
        clearTimeout(typingTimer);
        if (searchCompanyInput.value) {
            typingTimer = setTimeout(search, doneTypingInterval);
        } else {
            document.getElementById('company-select').innerHTML = `<option style="display: none">Select Company</option>`;
            updateInputs();
        }
    });

    async function search() {
        document.getElementById('password-saving').classList.remove('d-none');
        clearTimeout(save);
        var value = document.getElementById("company-name").value;
        var search = await searchCompanies(instance, value, key);
        document.getElementById('company-select').innerHTML = `<option style="display: none">Select Company</option>`;
        search.companies.forEach(element => {
            var opt = document.createElement('option');
            opt.value = element.id;
            opt.innerHTML = element.name;
            document.getElementById('company-select').appendChild(opt);
        });
        save = setTimeout(function () { document.getElementById('password-saving').classList.add('d-none'); }, 1000);
    }

    document.getElementById('company-select').addEventListener('change', function () {
        document.getElementById("password-title-preview").setAttribute('company-id', this.value);
    });

    document.getElementById('password-wrapper').addEventListener('input', () => {
        checkInputs('password-wrapper', 'password-window-apply', ["username", "password-title-preview"])
        updateInputs();
    });

    document.getElementById('password-window').addEventListener('hide.bs.modal', () => {
        clearPasswordInputs(true);
    });

    document.getElementById('password-window-apply').addEventListener('click', () => {
        var body = {
            asset_password: {
                password: document.getElementById('password').value,
                name: document.getElementById("password-title-preview").getAttribute("placeholder"),
                company_id: parseInt(document.getElementById("password-title-preview").getAttribute('company-id')),
                username: document.getElementById('username').value
            }
        };

        if (confirm(`Are you sure you want to create \"${body.asset_password.name}\" for ${document.getElementById('company-select').options[document.getElementById('company-select').selectedIndex].text}?`)) {
            document.getElementById('password-saving').classList.remove('d-none');
            clearTimeout(save);
            var headers = new Headers();
            headers.append("x-api-key", key);
            headers.append("Content-Type", "application/json");
            fetch(`https://${instance}.huducloud.com/api/v1/asset_passwords`, {
                method: 'POST',
                body: JSON.stringify(body),
                headers: headers,
                redirect: 'follow'
            }).then(r => {
                return r.json();
            }).then(data => {
                console.log(data);
                document.getElementById('password-alert').innerHTML = `<div class="alert alert-success alert-dismissible fade show px-3 py-2 tiny mt-2" role="alert">
                Added: <a href="${data.asset_password.url}" target="_blank">${data.asset_password.name}</a>
                <button type="button" class="btn-close small" data-bs-dismiss="alert" aria-label="Close" style="padding:.8rem .8rem"></button>
              </div>`
                clearPasswordInputs()
                save = setTimeout(function () { document.getElementById('password-saving').classList.add('d-none'); }, 1000);
            }).catch((error) => {
                document.getElementById('password-alert').innerHTML = `<div class="alert alert-danger alert-dismissible fade show px-3 py-2 tiny mt-2" role="alert">
                Failed to add password.
                <button type="button" class="btn-close small" data-bs-dismiss="alert" aria-label="Close" style="padding:.8rem .8rem"></button>
              </div>`
                console.error("Error:", error);
                save = setTimeout(function () { document.getElementById('password-saving').classList.add('d-none'); }, 1000);
            });
        }
    });
})();

function updateInputs() {
    var company = document.getElementById('company-select').options.length !== 1 ? document.getElementById('company-select').options[document.getElementById('company-select').selectedIndex].text : "{CLIENT}";
    var location = document.getElementById('location').value !== "" ? document.getElementById('location').value : "[ \"Global\" | {LOCATION} ]";
    var service = document.getElementById('service').value !== "" ? document.getElementById('service').value : "{SERVICE}";
    var account = document.getElementById('account').value !== "" ? document.getElementById('account').value : "{ACCOUNT}";

    document.getElementById("password-title-preview").setAttribute("placeholder", `${company} - ${location} - ${service} - ${account}`);
}

function checkInputs(container, button, exclude = []) {
    var inputContainer = document.getElementById(container);
    var inputs = inputContainer.getElementsByTagName('input');
    var submitButton = document.getElementById(button);

    var allInputsNotEmpty = true;

    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].value === '' && !exclude.includes(inputs[i].id)) {
            allInputsNotEmpty = false;
            break;
        }
    }

    if (allInputsNotEmpty) {
        submitButton.removeAttribute('disabled');
    } else {
        submitButton.setAttribute('disabled', 'disabled');
    }
}

function clearPasswordInputs(alert = false) {
    document.getElementById("company-name").value = "";
    document.getElementById("password-title-preview").setAttribute("placeholder", `{CLIENT} - [ "Global" | {LOCATION} ] - {SERVICE} - {ACCOUNT}`);
    document.getElementById('company-select').innerHTML = `<option style="display: none">Select Company</option>`;
    document.getElementById('location').value = "";
    document.getElementById('service').value = "";
    document.getElementById('account').value = "";
    document.getElementById('username').value = "";
    document.getElementById('password').value = "";
    document.getElementById("password-title-preview").setAttribute('company-id', "");
    document.getElementById('password-window-apply').setAttribute('disabled', 'disabled')

    if (alert) {
        document.getElementById('password-alert').innerHTML = "";
    }
}

async function searchCompanies(instance, name, key) {
    return fetch(`https://${instance}.huducloud.com/api/v1/companies?search=${name}`, { headers: { "x-api-key": key } })
        .then(response => response.json())
        .then(data => {
            return data
        })
        .catch(error => {

        });
}
