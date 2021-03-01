

function get(endpoint, headers) {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", endpoint);
        headers.split("\n").forEach(line => {
            if(!line.trim()) return;
            let parts = line.split(":");
            let name = parts[0].trim();
            let value = parts[1].trim();
            xhr.setRequestHeader(name, value);
        });

        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) { 
                var status = xhr.status;
                if (status === 0 || (status >= 200 && status < 400)) {
                    resolve(xhr.responseText);
                } else {
                    reject(status);
                }
            }
        };

        xhr.send();
    });
}

function post(endpoint, data) {
    return new Promise(function (resolve, reject) {
        var formData = new FormData();
        formData.append('data', data);
        
        var xhr = new XMLHttpRequest();
        //console.log(`opening POST connection to ${endpoint}`);
        xhr.open('POST', endpoint, true);

        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) { 
                var status = xhr.status;
                if (status === 0 || (status >= 200 && status < 400)) {
                    resolve(xhr.responseText);
                } else {
                    reject(status);
                }
            }
        };
        xhr.send(formData);
    });
}

