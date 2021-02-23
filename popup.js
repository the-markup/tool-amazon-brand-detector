console.log("popup.js", window.location.href);


// This is needed to open links from popup.html
window.onclick = function(e) {
    if(e.target.href) chrome.tabs.create({url: e.target.href});
}


function truncate(str) {
    const len = 50;
    return (str.length <= len) ? str : str.slice(0, len) + '...'
}

chrome.runtime.sendMessage({"type": "popup"}, function onContent(content) {
    try {
        var html = `<h2>Amazon Brands</h2>
        <ol>`;
        
        content.forEach(p =>{
            html += '<li>';
            html += `<a href="${p.link}">${truncate(p.title)}</a>`;
            html += '</li>';
        });
        html += `</ol>`;
        document.body.innerHTML = html;
    } catch(e) {
        document.body.append("error rendering content", e);
    }
});
