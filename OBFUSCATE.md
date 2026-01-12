# JavaScript Obfuscation Guide

This guide explains how to obfuscate the JavaScript files before uploading to GitHub Pages.

## Option 1: Using npm/javascript-obfuscator (Recommended)

### Step 1: Install the obfuscator
```bash
npm install javascript-obfuscator
```

If you get permission errors, fix npm cache permissions first:
```bash
sudo chown -R $(whoami) ~/.npm
```

### Step 2: Run the obfuscation script
```bash
node obfuscate.js
```

This will create:
- `app.obfuscated.js` - Obfuscated version of app.js
- `publications-data.obfuscated.js` - Lightly obfuscated data file

### Step 3: Update index.html
Replace the script tags in `index.html`:
```html
<!-- Change from: -->
<script src="publications-data.js"></script>
<script src="app.js"></script>

<!-- To: -->
<script src="publications-data.obfuscated.js"></script>
<script src="app.obfuscated.js"></script>
```

### Step 4: Test locally
Open `index.html` in your browser to ensure everything still works.

### Step 5: Upload to GitHub
Upload the obfuscated files instead of the original ones.

---

## Option 2: Online Obfuscator (No installation needed)

1. Go to https://obfuscator.io/
2. Copy the contents of `app.js` and paste it into the obfuscator
3. Configure settings (use default or recommended settings)
4. Click "Obfuscate"
5. Copy the obfuscated code and save it as `app.obfuscated.js`
6. Repeat for `publications-data.js` (use lighter settings for the data file)

---

## Option 3: Manual Build Script

If you prefer to obfuscate manually, you can use npx:

```bash
# Obfuscate app.js
npx --yes javascript-obfuscator app.js --output app.obfuscated.js \
  --compact true \
  --control-flow-flattening true \
  --string-array true \
  --string-array-encoding base64 \
  --self-defending true

# Lightly obfuscate publications-data.js (mostly data, so lighter obfuscation)
npx --yes javascript-obfuscator publications-data.js --output publications-data.obfuscated.js \
  --compact true \
  --string-array true
```

---

## Important Notes

1. **Always test** the obfuscated files locally before uploading
2. **Keep backups** of your original files
3. **Obfuscation doesn't provide security** - it only makes code harder to read
4. The `publications-data.js` file is large (2.9MB) - obfuscating it will make it even larger
5. Consider if you really need to obfuscate the data file, as it's mostly JSON data

---

## Recommended Approach

For this project, I recommend:
- **Obfuscate `app.js`** (contains your application logic)
- **Optionally obfuscate `publications-data.js`** (mostly data, obfuscation may not be necessary)

The obfuscated files will work exactly the same as the original files, just harder to read.
