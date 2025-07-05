document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("trackerForm");
    const logList = document.getElementById("logList");
    const container = document.querySelector(".container");
    const message = document.getElementById("message");
    const infoBtn = document.getElementById("infoBtn");
    const explainer = document.getElementById("explainer");
    const installPwaBtn = document.getElementById("installPwaBtn");
    let deferredPrompt;

    // Toggle explainer information display
    infoBtn.addEventListener("click", () => {
        if (explainer.style.display === "none") {
            explainer.style.display = "block";
            infoBtn.textContent = "Hide Info";
        } else {
            explainer.style.display = "none";
            infoBtn.textContent = "How does this work?";
        }
    });

    // Handle the beforeinstallprompt event
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installPwaBtn.style.display = "block"; // Show the install button
        installPwaBtn.style.margin = "10px 0"; // Ensure same margin as other button
        installPwaBtn.style.width = "100%"; // Ensure same width as other button
        installPwaBtn.style.maxWidth = "300px"; // Ensure same max-width as other button
    });

    // Handle the PWA install button click event
    installPwaBtn.addEventListener("click", () => {
        installPwaBtn.style.display = "none"; // Hide the install button
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === "accepted") {
                console.log("User accepted the A2HS prompt");
            } else {
                console.log("User dismissed the A2HS prompt");
            }
            deferredPrompt = null;
        });
    });

    // Handle the appinstalled event
    window.addEventListener("appinstalled", () => {
        console.log("PWA was installed");
        installPwaBtn.style.display = "none"; // Ensure the install button is hidden after installation
    });

    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        installPwaBtn.style.display = "none"; // Hide the install button if already installed
    }

    // Handle form submission
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        
        const date = formatDate(document.getElementById("date").value);

        // Get the selected mucus value
        const mucusRadio = document.querySelector('input[name="mucus"]:checked');
        const mucus = mucusRadio ? mucusRadio.value : ""; // Get the value of the selected radio button

        if (date && mucus) {
            saveObservation(date, mucus);
            displayLog();
            checkFertilityStatus();
        }
    });

    // Save observation to local storage
    function saveObservation(date, mucus) {
        let observations = JSON.parse(localStorage.getItem("observations")) || [];
        const existingIndex = observations.findIndex(obs => obs.date === date);
        if (existingIndex !== -1) {
            observations[existingIndex] = { date, mucus };
        } else {
            observations.push({ date, mucus });
        }
        observations.sort((a, b) => new Date(b.date) - new Date(a.date));
        localStorage.setItem("observations", JSON.stringify(observations));
    }

    // Delete observation from local storage
    function deleteObservation(index) {
        let observations = JSON.parse(localStorage.getItem("observations")) || [];
        observations.splice(index, 1);
        localStorage.setItem("observations", JSON.stringify(observations));
        displayLog();
        checkFertilityStatus();
    }

    // Display the log of observations
    function displayLog() {
        const observations = JSON.parse(localStorage.getItem("observations")) || [];
        observations.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (observations.length === 0) {
            logList.innerHTML = "";
            message.innerText = "Enter data to track fertility";
            return;
        }
        
        message.innerText = "";

        logList.innerHTML = observations.map((obs, index) => {
            const formattedDate = formatDisplayDate(obs.date);
            return `<li>${formattedDate}: ${obs.mucus} <button onclick="deleteObservation(${index})">Delete</button></li>`;
        }).join('');
    }

    // Check the fertility status based on observations
    function checkFertilityStatus() {
        const observations = JSON.parse(localStorage.getItem("observations")) || [];
        if (observations.length === 0) {
            document.body.style.backgroundColor = "#f4f4f4";
            message.innerText = "Enter data to track fertility";
            return;
        }

        const today = new Date().toLocaleDateString('en-CA');
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

        const todayObservation = observations.find(obs => obs.date === today);
        const yesterdayObservation = observations.find(obs => obs.date === yesterday);

        const todayHasMucus = todayObservation && todayObservation.mucus === "yes";
        const yesterdayHasMucus = yesterdayObservation && yesterdayObservation.mucus === "yes";
        const todayMissing = !todayObservation;
        const yesterdayMissing = !yesterdayObservation;

        if (todayHasMucus || yesterdayHasMucus || todayMissing || yesterdayMissing) {
            message.innerText = "Pregnancy is possible today";
            document.body.style.backgroundColor = "#9B5D9B";
            message.style.backgroundColor = "#6A0D91";
            message.style.color = "#FFFFFF";
        } else {
            message.innerText = "Pregnancy is unlikely today";
            document.body.style.backgroundColor = "#FEFB87";
            message.style.backgroundColor = "#FFF826";
            message.style.color = "#000000";
        }
    }

    // Format date for display
    function formatDisplayDate(dateString) {
        const date = new Date(dateString);
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return date.toLocaleDateString(undefined, options);
    }

    // Format date for storage
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-CA');
    }

    // Initialize the display
    displayLog();
    checkFertilityStatus();

    // Function to delete observation globally
    window.deleteObservation = deleteObservation;

    // Service Worker Update Logic
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
            console.log('Service Worker registered with scope:', registration.scope);

            // Check if a new service worker is available
            registration.addEventListener('updatefound', function() {
                const installingWorker = registration.installing;
                installingWorker.onstatechange = function() {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New service worker has been installed
                        console.log('New content is available; please refresh.');
                        // Notify the user and automatically refresh
                        if (confirm('A new version is available. Refresh to update?')) {
                            installingWorker.postMessage({ action: 'skipWaiting' });
                            window.location.reload(); // Force refresh after new worker is activated
                        }
                    }
                };
            });
        }).catch(function(error) {
            console.log('Service Worker registration failed:', error);
        });
    }
});
