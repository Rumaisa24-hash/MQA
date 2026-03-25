document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('qa-form');
  const loadingOverlay = document.getElementById('loading-overlay');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const figmaUrl = document.getElementById('figma-url').value;
    const webpageUrl = document.getElementById('webpage-url').value;
    const compareUrl = document.getElementById('compare-url').value;
    const metaTitle = document.getElementById('meta-title').value;
    const metaDesc = document.getElementById('meta-description').value;

    if (!figmaUrl || !webpageUrl) {
      alert("Figma and Webpage URLs are required!");
      return;
    }

    loadingOverlay.classList.remove('hidden');

    setTimeout(() => {
      console.log('--- Commencing QA ---');
      console.log('Figma:', figmaUrl);
      console.log('Webpage:', webpageUrl);
      console.log('Compare URL:', compareUrl);
      console.log('Meta Title:', metaTitle);
      console.log('Meta Description:', metaDesc);
      
      alert(`QA Environment Launched for: \n${webpageUrl}`);
      loadingOverlay.classList.add('hidden');
    }, 2000);
  });
});
