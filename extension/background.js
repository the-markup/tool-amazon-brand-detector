
const icons_disabled = {
    "16": "/assets/icons-disabled/16.png",
    "19": "/assets/icons-disabled/19.png",
    "32": "/assets/icons-disabled/32.png",
    "64": "/assets/icons-disabled/64.png",
    "128": "/assets/icons-disabled/128.png"
}
const icons_enabled = {
    "16": "/assets/icons/16.png",
    "19": "/assets/icons/19.png",
    "32": "/assets/icons/32.png",
    "64": "/assets/icons/64.png",
    "128": "/assets/icons/128.png"
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(request=="isDev") {
        chrome.management.getSelf(self => {
            sendResponse(self.installType=="development");
        });
    }
    return true; // VERY IMPORTANT TO RETURN TRUE HERE. Because of asynchronous sendResponse.
});

/**
 * Fires when the active tab in a window changes. 
 * Note that the tab's URL may not be set at the time this event fired, 
 * but you can listen to onUpdated events so as to be notified when a URL is
 * https://developer.chrome.com/docs/extensions/reference/tabs/#event-onActivated
 */
chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.query({active: true}, function(tab) {
        updateIcon(tab.url);
    });
});

/**
 * Fired when a tab is updated.
 * https://developer.chrome.com/docs/extensions/reference/tabs/#event-onUpdated
 * We need to tell the tab that the URL has changed because the content script doesn't always automatically reload.
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url) {
        chrome.tabs.sendMessage(tabId, "url_changed");
        updateIcon(changeInfo.url);
    }
});

/**
 * Change the popup icon based on the current URL
 * @param {string} url 
 */
function updateIcon(url) {
    if(!url) return;
    const icons = url.match(/amazon.*\/s/) 
        ? icons_enabled 
        : icons_disabled;
    chrome.browserAction.setIcon({ path : icons });
}