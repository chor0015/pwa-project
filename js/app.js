
const APP = {
    DB: null,  //the indexedDB
    DBVersion: 1,
    searchStore: null,
    suggestStore: null,
    isONLINE: 'onLine' in navigator && navigator.onLine,
    tmdbBASEURL: 'https://api.themoviedb.org/3/',
    tmdbAPIKEY: '99bfb48bf74bed439d4a45a53a55f249',
    tmdbIMAGEBASEURL: 'https://image.tmdb.org/t/p/w1280',
    input: null,
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

            //create suggestStore with movieid as keyPath
            APP.suggestStore = APP.DB.createObjectStore("suggestStore", {keyPath: "movieid", autoIncrement: false,});

        }
        
        dbOpenRequest.onerror = function (err) {
            console.log(err.message);
         //an error has happened during opening
        };

        dbOpenRequest.onsuccess = function (ev) {
            APP.DB = dbOpenRequest.result;
            //or ev.target.result
            //result will be the reference to the database that you will use
            console.log(APP.DB.name);
            console.log(APP.DB.version);
            console.log(APP.DB.objectStoreNames);
            console.log(APP.DB.name, `is ready to be used.`); 
            //call nextStep onsuccess
            nextStep()
        };
    },
    
    createTransaction: (storeName)=>{
        let tx = APP.DB.transaction(storeName, 'readwrite');
        //create a transaction to use for some interaction with the database
        return tx;
    },
    getDBResults: (storeName, keyValue) => {
        //return the results from storeName where it matches keyValue
        console.log(keyValue)
        let searchStore = APP.createTransaction(storeName).objectStore(storeName)

        let req = searchStore.openCursor(keyValue);
        req.onsuccess = function(ev) {
            var cursor = ev.target.result; 
            if (cursor) { // key already exist
                APP.navigate(keyValue)
            } else { // key not exist
                APP.getData(keyValue, APP.addResultsToDB)
                console.log('getDBResults test')
            }
        };

        // let getRequest = searchStore.get(keyValue)
        // console.log(getRequest)

        // getRequest.onerror = (err) => {
        // };

        // getRequest.onsuccess = (ev) => {
        //     let obj = getRequest.result;
        //     console.log({ obj });
        //     return obj
        // };
        
    },

    addResultsToDB: (obj, storeName,input)=>{
        console.log('i got to AddResultsToDB')
        console.log(obj)
        console.log(storeName)
        let store = APP.createTransaction(storeName).objectStore(storeName)

        let newObj = {
            keyword: input,
            results: obj,
        };

        let addReq = store.add(newObj);
        
        addReq.onerror = (err) => {
            //failed insert
        };
        addReq.onsuccess = (ev) => {
            console.log('movie added');
            APP.getSearchResults(input)
        //tx.oncomplete called now
        };
          //save the obj passed in to the appropriate store

        //pass in the name of the store
        //save the obj passed in to the appropriate store
    },
    addListeners: ()=>{
        //add event listeners for DOM
        let searchForm = document.querySelectorAll('#searchForm')
        searchForm.forEach((form) => {
            form.addEventListener('submit', APP.searchFormSubmitted)
        })
        // searchForm.addEventListener('submit', APP.searchFormSubmitted)
        
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
        let searchArea = document.getElementById('searchArea')
        let offlineMessage = document.getElementById('offline')
        if (APP.isONLINE) {
            //online
            searchArea.classList.remove('display-none')
            offlineMessage.classList.add('display-none')
        } else {
            //offline
            searchArea.classList.add('display-none')
            offlineMessage.classList.remove('display-none')
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
    
        APP.input = document.getElementById('search').value;
        if (APP.input) 
        history.pushState({}, APP.input, `#${APP.input}`)
        
        console.log(APP.input)

        let input = location.hash
        APP.getDBResults( 'searchStore', APP.input)
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
    getData: (input, nextStep)=>{
        console.log(input)
        //do a fetch call to the endpoint
        let url = `${APP.tmdbBASEURL}search/movie?api_key=${APP.tmdbAPIKEY}&query=${input}&language=en-US`
        console.log('Fetching...')
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
                let newResults = results.map(({adult, backdrop_path, genre_ids, original_title, video, vote_count,...rest}) => rest)              


                //save the updated results to APP.results
                APP.results = newResults
                console.log(APP.results)

                // call the callback

                nextStep(APP.results, 'searchStore', input)
                
            })
            .catch(err=>{
                //handle the NetworkError
            })
    },
    getSearchResults:(input)=>{
        let url = `/results.html`
        console.log(url)
        APP.navigate(url)
        // //check if online
        // if (APP.isONLINE) {
        //     //online
            
        // } else {
        //     //offline
        //     searchArea.classList.add('display-none')
        //     offlineMessage.classList.remove('display-none')
        // }
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
        window.location = `${url}#${APP.input}`; //this should include the querystring
    }

}

document.addEventListener('DOMContentLoaded', APP.init);
