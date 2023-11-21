const modal = document.getElementById("loading-modal");
const progress = document.getElementById("loading-progress");

const urlInput = document.getElementById("url-input");
const idInput = document.getElementById("id-input");

const urlParams = new URLSearchParams(window.location.search);
const urlParam = urlParams.get('url');
const projectParam = urlParams.get('project');

const fileInput = document.getElementById("file-input");
const fileName = document.getElementById("file-name");

const mrApi = "https://api.modrinth.com/v2/project/"
const mrApiGetVersions = "/version"

if (urlParam != null) {
  downloadPack(urlParam);
} else if (projectParam == 'fo') {
  window.location("https://download.fo/mrpack-to-zip/vanilla?download=latest");
} else if (projectParam != null) {
  downloadLatestPack(projectParam);
}

function downloadButton() {
  downloadPack(urlInput.value);
}

function downloadLatestButton() {
  downloadLatestPack(idInput.value);
}

function downloadLatestFo() {
  downloadLatestPack("1KVo5zza");
}

function downloadLocalButton() {
  downloadPackData(fileInput.files[0]);
}

async function downloadLatestPack(id) {
  const response = await fetch(mrApi + id + mrApiGetVersions);

  try {
    const response = await fetch(mrApi + id + mrApiGetVersions);

    if (!response.ok) {
      alert("Invalid project ID or server error!");
    }

  } catch (error) {
    alert("An unknown error occurred!");
  }

  if (response == null) {
    alert("Server error!");
  }
  let data = await response.json();

  if (data == null) {
    alert("Invalid project ID!");
  } else if (data[0].files[0].url == null) {
    alert("No files found!");
  }

  downloadPack(data[0].files[0].url);
}

function downloadPack(url) {
  if (url.includes("modpack")) {
    alert("Please copy the link of the green download button, not the version page!");
    return;
  } else if (!url.includes("mrpack")) {
    alert("That is not a valid mrpack URL.");
    return;
  }

  // Show the modal
  modal.classList.add("is-active");

  JSZipUtils.getBinaryContent(url, function (err, data) {
    if (err) {
      throw err; // or handle err
    }

    downloadPackData(data);
  });
}

function updateFileName() {
  if (fileInput.files.length > 0) {
    fileName.textContent = fileInput.files[0].name;
  }
}

function downloadPackData(data) {
  if (data.length <= 0) {
    return;
  }

  // Start creating a new zip file
  var newZip = new JSZip();

  // Read the zip file, so we can read the manifest
  JSZip.loadAsync(data)
    .then(async function (zip) {

      // Read the manifest
      const manifestRaw = await zip.files['modrinth.index.json'].async('string');
      const manifest = JSON.parse(manifestRaw);

      for (const fileName in zip.files) {
        const file = zip.files[fileName];
        if (file.dir) {
          continue;
        }

        if (file.name.startsWith("overrides/")) {
          const properFileName = file.name.substring("overrides/".length);
          newZip.file(properFileName, file.async('blob'));
        }

        if (file.name.startsWith("client-overrides/")) {
          const properFileName = file.name.substring("client-overrides/".length);
          newZip.file(properFileName, file.async('blob'));
        }
      }

      var totalFileSize = 0;
      var downloaded = 0;

      for (const fileIndex in manifest.files) {
        const file = manifest.files[fileIndex];

        totalFileSize += file.fileSize;
      }
      progress.max = totalFileSize;

      const filePromises = [];
      for (const fileIndex in manifest.files) {
        const file = manifest.files[fileIndex];

        if (file.downloads[0].includes("github.com")) {
          window.open(file.downloads[0], '_blank');
        } else {
          newZip.file(file.path, fetch(file.downloads[0]).then(function (f) {
            downloaded += file.fileSize;
            progress.value = downloaded;
            return f.blob();
          }));
        }

      }

      newZip.generateAsync({
        type: "blob"
      }).then(function (content) {
        saveAs(content, manifest['name'] + '-' + manifest['versionId'] + '.zip');

        // Close the modal
        modal.classList.remove("is-active");
      });

    });
}
