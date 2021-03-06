const version = 1;
const staticCache = `PWA-Static-Movie-APP-${version}`;
const dynamicCache = `PWA-Dynamic-Movie-APP-${version}`;
const dynamicImgCache = `PWA-Dynamic-Img-Movie-APP-${version}`;
const cacheLimit = 40;
const cacheList = [
    '/',
    '/index.html',
    '/404.html',
    '/results.html',
    '/suggested.html',
    '/css/main.css',
    '/js/app.js',
    '/manifest.json',
    '/favicon.ico',
    '/img/tmdb-logo.svg',
    '/img/logo.png',
    '/img/404.webp',
    '/img/android-chrome-192x192.png',
    '/img/android-chrome-512x512.png',
    '/img/apple-touch-icon.png',
    '/img/favicon-16x16.png',
    '/img/favicon-32x32.png',
    '/img/placeholder-img.png',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
];

self.addEventListener('install', (ev) => {
    ev.waitUntil(
        caches.open(staticCache).then((cache) => {
        //save the whole cacheList
        cache.addAll(cacheList);
        })
    );
});
self.addEventListener('activate', (ev) => {
    ev.waitUntil(
        caches
        .keys()
        .then((keys) => {
            return Promise.all(
            keys
                .filter((key) => {
                if (key === staticCache || key === dynamicCache) {
                    return false;
                } else {
                    return true;
                }
                })
                .map((key) => caches.delete(key))
          ); //keys.filter().map() returns an array of Promises
        })
        .catch(console.warn)
    );
});

self.addEventListener("fetch", (ev) => {
    ev.respondWith(
        caches.match(ev.request).then((cacheRes) => {
            return (
            cacheRes ||
            fetch(ev.request)
                .then((fetchRes) => {
                //TODO: check here for the 404 error
                // Make a third cache for images only
                if (fetchRes.status > 399) throw new Error(fetchRes.statusText);
                if (fetchRes.type === "opaque") {
                    return caches.open(dynamicImgCache).then((cache) => {
                    let copy = fetchRes.clone(); //make a copy of the response
                    cache.put(ev.request, copy); //put the copy into the cache
                    cache.keys().then((key) => {
                        if (key.length > cacheLimit) {
                        limitCacheSize(dynamicImgCache);
                        }
                    });
                    return fetchRes; //send the original response back up the chain
                    });
                } else {
                    return caches.open(dynamicCache).then((cache) => {
                    let copy = fetchRes.clone(); //make a copy of the response
                    cache.put(ev.request, copy); //put the copy into the cache
                    return fetchRes; //send the original response back up the chain
                    });
                }
                })
                .catch(async (err) => {
                console.log("SW fetch failed");
                console.warn(err);
                if (ev.request.mode == "navigate") {
                    //send the 404 page
                    return caches.match("/404.html").then((page404Response) => {
                    return page404Response;
                    });
                }
                })
            );
        })
    ); //what do we want to send to the browser?
});

function sendMessage(msg) {
    //send a message to the browser
    //from the service Worker
    //code from messaging.js Client API send message code
    self.clients.matchAll().then(function (clients) {
        if (clients && clients.length) {
        //Respond to last focused tab
        clients[0].postMessage(msg);
        }
    });
}

function limitCacheSize(nm, size = 40) {
    //remove some files from the dynamic cache
    return caches.open(nm).then((cache) => {
        return cache.keys().then((keys) => {
            let numOfKeys = keys.length;
            if (numOfKeys > size) {
            return cache.delete(keys[numOfKeys - 1]).then(() => {
                return limitCacheSize(nm, size);
            });
            }
        });
        });
}

function checkForConnection(){
    //try to talk to a server and do a fetch() with HEAD method.
    //to see if we are really online or offline
    //send a message back to the browser
}