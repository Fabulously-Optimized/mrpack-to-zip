const modal = document.getElementById("loading-modal");
const progress = document.getElementById("loading-progress");

const fileInput = document.getElementById("file-input");
const fileName = document.getElementById("file-name");

function updateFileName() {
  if (fileInput.files.length > 0) {
    fileName.textContent = fileInput.files[0].name;
  }
}

function downloadPack() {
  if (fileInput.files.length <= 0) {
    return;
  }

  // Show the modal
  modal.classList.add("is-active");

  // Start creating a new zip file
  var newZip = new JSZip();

  // Read the zip file, so we can read the manifest
  JSZip.loadAsync(fileInput.files[0])
    .then(async function(zip) {

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

        if (file.env.client != 'required') {
          continue;
        }

        newZip.file(file.path, fetch(file.downloads[0]).then(function(f) {
          downloaded += file.fileSize;
          progress.value = downloaded;
          return f.blob();
        }));
      }

      newZip.generateAsync({type:"blob"}).then(function(content) {
        saveAs(content, manifest['name'] + '-' + manifest['versionId'] + '.zip');

        // Close the modal
        modal.classList.remove("is-active");
      });

    });
}
