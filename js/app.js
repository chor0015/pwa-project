
const APP = {
    DB: null,  //the indexedDB
    DBVersion: 1,
    searchStore: null,
    suggestStore: null,
    isONLINE: 'onLine' in navigator && navigator.onLine,
    tmdbBASEURL: 'https://api.themoviedb.org/3/',
    tmdbAPIKEY: '99bfb48bf74bed439d4a45a53a55f249',
    tmdbIMAGEBASEURL: 'https://image.tmdb.org/t/p/w1280',
    results: [],
    init: ()=>{
        //when the page loads
        //open the database
        APP.openDatabase(APP.registerSW); //register the service worker after the DB is open
        
    },
    registerSW: ()=>{
        //register the service worker
        // COPIED
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(function (err) {
              // Something went wrong during registration. The sw.js file
              // might be unavailable or contain a syntax error.
                console.warn(err);
            });
            navigator.serviceWorker.ready.then((registration) => {
              // .ready will never reject... just wait indefinitely
                APP.sw = registration.active;
              //save the reference to use later or use .ready again
            });
        }
        // END COPIED
        
        //then add listeners and run page specific code
        APP.pageSpecific();
        APP.addListeners();
    },
    
    openDatabase: (nextStep)=>{
        //open the database
        let dbOpenRequest = indexedDB.open('movieDB', APP.DBVersion);

        //add the update, error, success listeners in here
        dbOpenRequest.onupgradeneeded = function (ev) {
            console.log('upgrade needed')
            APP.DB = ev.target.result;

            try {
            APP.DB.deleteObjectStore('searchStore');
            APP.DB.deleteObjectStore('suggestStore');
            } catch (err) {
                console.log('err deleting older db')
            }

            //create searchStore with keyword as keyPath
            APP.searchStore = APP.DB.createObjectStore("searchStore", {keyPath: "keyword", autoIncrement: false,});
            APP.searchStore.createIndex("by_title", "title", { unique: false });
            //create suggestStore with movieid as keyPath
            APP.suggestStore = APP.DB.createObjectStore("suggestStore", {keyPath: "movieid", autoIncrement: false,});
            APP.suggestStore.createIndex("by_title", "title", { unique: false });
        }
        
        dbOpenRequest.onerror = function (err) {
            console.log(err.message);
         //an error has happened during opening
        };

        dbOpenRequest.onsuccess = function (ev) {
            APP.DB = dbOpenRequest.result;
            //or ev.target.result
            //result will be the reference to the database that you will use
            console.log(APP.DB.oldVersion)
            console.log(APP.DB.name);
            console.log(APP.DB.version);
            console.log(APP.DB.objectStoreNames);
            console.log(APP.DB.name, `is ready to be used.`); 
            //call nextStep onsuccess
            nextStep()
        };
    },
    
    createTransaction: (storeName)=>{
        let isDataAdded = localStorage.getItem(`MDB${APP.DBVersion}`);

        if (!isDataAdded) { //the data is not there
            let tx = APP.DB.transaction(storeName, 'readwrite');
            console.log({ tx });

            APP.addResultsToDB(tx, storeName, index);
            tx.oncomplete = function (ev) {
                console.log('All movies added');
                localStorage.setItem(`MDB${APP.DBVersion}`, true)
            }
            return tx
        } else {
        } 
    },
    getDBResults: (storeName, keyValue) => {
        //return the results from storeName where it matches keyValue
    },
    addResultsToDB: (obj, storeName, index)=>{
        //pass in the name of the store
        //save the obj passed in to the appropriate store
    },
    addListeners: ()=>{
        //add event listeners for DOM
        
        //check if already installed
        if (navigator.standalone) {
            console.log('Launched: Installed (iOS)');
            APP.isStandalone = true;
        } else if (matchMedia('(display-mode: standalone)').matches) {
            console.log('Launched: Installed');
            APP.isStandalone = true;
        } else {
            // console.log('Launched: Browser Tab');
            APP.isStandalone = false;
        }
    
        //add event listeners for online and offline
        window.addEventListener('online', APP.changeOnlineStatus);
        window.addEventListener('offline', APP.changeOnlineStatus);
    
        //add listener for message
        navigator.serviceWorker.addEventListener('message', APP.messageReceived);
    
        //add listener for install event
        window.addEventListener('beforeinstallprompt', (ev) => {
            // Prevent the mini-infobar from appearing on mobile
            ev.preventDefault();
            // Save the event in a global property
            // so that it can be triggered later.
            APP.deferredPrompt = ev;
            console.log('deferredPrompt saved');
            // Build your own enhanced install experience
            // use the APP.deferredPrompt saved event
        });
    },

    pageSpecific:()=>{
        //anything that happens specifically on each page
        if(document.body.id === 'home'){
            //on the home page
        }
        if(document.body.id === 'results'){
            //on the results page
            //listener for clicking on the movie card container 
        }
        if(document.body.id === 'suggest'){
            //on the suggest page
            //listener for clicking on the movie card container 
        }
        if(document.body.id === 'fourohfour'){
            //on the 404 page
        }
    },
    changeOnlineStatus: (ev)=>{
        //when the browser goes online or offline
        APP.isONLINE = ev.type === 'online' ? true : false;
        //TODO: send message to sw about being online or offline
        navigator.serviceWorker.ready.then((registration) => {
        registration.active.postMessage({ ONLINE: APP.isONLINE});
    });

    APP.changeDisplay();
    },

    changeDisplay: () => {
        if (APP.isONLINE) {
            //online
            
        } else {
            //offline
            document.body.style.background ='#000000'
        }
    },

    messageReceived: (ev)=>{
        //ev.data
    },
    sendMessage: (msg)=>{
        //send a message to the service worker
    },
    searchFormSubmitted: (ev)=>{
        ev.preventDefault();
        //get the keyword from teh input
        //make sure it is not empty
        //check the db for matches
        //do a fetch call for search results
        //save results to db
        //navigate to url
    },
    cardListClicked: (ev)=>{
        // user clicked on a movie card
        //get the title and movie id
        //check the db for matches
        //do a fetch for the suggest results
        //save results to db
        //build a url
        //navigate to the suggest page
    },
    getData: (endpoint, callback)=>{
        //do a fetch call to the endpoint
        fetch(url)
            .then(resp=>{
                if(resp.status >= 400){
                    throw new NetworkError(`Failed fetch to ${url}`, resp.status, resp.statusText);
                }
                return resp.json();
            })
            .then(contents=>{
                let results = contents.results;
                //remove the properties we don't need
                //save the updated results to APP.results
                // call the callback
            })
            .catch(err=>{
                //handle the NetworkError
            })
    },
    getSearchResults:(keyword)=>{
        //check if online
        //check in DB for match of keyword in searchStore
        //if no match in DB do a fetch
        // APP.displayCards is the callback
    },
    getSuggestedResults:(movieid)=>{
        //check if online
        //check in DB for match of movieid in suggestStore
        //if no match in DB do a fetch 
        // APP.displayCards is the callback
    },
    displayCards: ()=>{
        //display all the movie cards based on the results array
        // in APP.results
        //these results could be from the database or from a fetch
    },
    navigate: (url)=>{
        //change the current page
        window.location = url; //this should include the querystring
    }

}

document.addEventListener('DOMContentLoaded', APP.init);
