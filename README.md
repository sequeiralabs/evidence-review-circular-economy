# Publications Web Application

A web application for viewing and managing circular economy publications from Africa. The application loads data from a CSV file and stores it in IndexedDB for fast, offline access.

## Features

- **CSV Import**: Load publications from `africa_ce_waste.csv`
- **IndexedDB Storage**: Data is persisted in the browser's IndexedDB for offline access
- **Search**: Search publications by title, abstract, keywords, or authors
- **Filtering**: Filter by year and publication type
- **Pagination**: Browse through publications with pagination controls
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### No Server Required! 🎉

Simply double-click `index.html` to open it in your web browser. The application will work directly from your file system.

**Steps:**
1. Locate `index.html` in the publications folder
2. Double-click it (or right-click and select "Open with" → your preferred browser)
3. Click "Select CSV File" and choose your `africa_ce_waste.csv` file
4. The data will be loaded automatically!

### Alternative: Using a Local Server (Optional)

If you prefer to use a local server (not required), you can use any of these methods:

**Option 1: Python's Built-in Server**
```bash
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

**Option 2: Node.js http-server**
```bash
npm install -g http-server
http-server -p 8000
```

**Option 3: VS Code Live Server**
Install the "Live Server" extension and right-click `index.html` → "Open with Live Server"

## Usage

1. **Load Publications**: Click "Select CSV File" and choose your `africa_ce_waste.csv` file. The data will automatically be imported into IndexedDB
2. **Search**: Use the search box to find publications by any text
3. **Filter**: Use the year and type dropdowns to filter publications
4. **Browse**: Use pagination controls to navigate through pages
5. **Clear Database**: Use "Clear Database" to remove all stored publications

**Note**: This application works without a web server! Simply double-click `index.html` to open it in your browser, then select your CSV file.

## File Structure

```
publications/
├── index.html          # Main HTML file
├── styles.css          # Stylesheet
├── app.js             # JavaScript application logic
├── africa_ce_waste.csv # Data source
└── README.md          # This file
```

## Technical Details

- **Database**: IndexedDB (browser-based NoSQL database)
- **Storage**: Data persists across browser sessions
- **Performance**: IndexedDB provides fast querying and filtering
- **Offline Support**: Once loaded, data is available offline

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Note: IndexedDB is supported in all modern browsers. For older browsers, consider using a polyfill.
