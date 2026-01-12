// IndexedDB Configuration
const DB_NAME = 'PublicationsDB';
const DB_VERSION = 3; // Incremented to trigger URL migration
const STORE_NAME = 'publications';

let db = null;
let currentPage = 1;
const recordsPerPage = 20;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeDB().then(() => {
        updateRecordCount();
        checkAndLoadData();
        setupEventListeners();
    });
});

// Check if data exists in IndexedDB, if not try to load CSV automatically
function checkAndLoadData() {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
        const count = countRequest.result;

        if (count === 0) {
            // No data in IndexedDB, try to load CSV automatically
            console.log('Database is empty, attempting to load CSV file...');
            autoLoadCSV();
        } else {
            // Data exists, verify count and load publications
            console.log(`Database contains ${count} records`);
            loadPublications();
        }
    };
}

// Try to automatically load CSV file
async function autoLoadCSV() {
    const statusEl = document.getElementById('status');

    // First check if embedded data is available
    if (typeof EMBEDDED_PUBLICATIONS_DATA !== 'undefined' && EMBEDDED_PUBLICATIONS_DATA.length > 0) {
        const records = EMBEDDED_PUBLICATIONS_DATA;

        console.log(`Using embedded data: ${records.length} records`);

        statusEl.textContent = `Auto-loading ${records.length} records...`;
        statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px] bg-mcf-yellow-container text-mcf-yellow-on-container';

        // Clear existing records first to ensure clean load
        await clearDatabaseInternal();

        // Store all records in IndexedDB
        await storeRecords(records);

        // Verify all records were stored
        const verifyTransaction = db.transaction([STORE_NAME], 'readonly');
        const verifyStore = verifyTransaction.objectStore(STORE_NAME);
        const verifyCount = await new Promise((resolve) => {
            const countRequest = verifyStore.count();
            countRequest.onsuccess = () => resolve(countRequest.result);
        });

        console.log(`Successfully stored ${verifyCount} records in IndexedDB`);

        statusEl.textContent = `Successfully loaded ${verifyCount} publications!`;
        statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px] bg-green-50 text-green-900';

        // Update UI
        updateRecordCount();
        loadPublications();

        // Clear status after 3 seconds
        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px]';
        }, 3000);

        return;
    }

    // Fallback: try to fetch the CSV file (works when served via HTTP/HTTPS)
    try {
        const response = await fetch('africa_ce_waste.csv');
        if (response.ok) {
            const csvText = await response.text();
            const records = parseCSV(csvText);

            console.log(`Parsed ${records.length} records from CSV file`);

            statusEl.textContent = `Auto-loading ${records.length} records...`;
            statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px] bg-mcf-yellow-container text-mcf-yellow-on-container';

            // Clear existing records first to ensure clean load
            await clearDatabaseInternal();

            // Store all records in IndexedDB
            await storeRecords(records);

            // Verify all records were stored
            const verifyTransaction = db.transaction([STORE_NAME], 'readonly');
            const verifyStore = verifyTransaction.objectStore(STORE_NAME);
            const verifyCount = await new Promise((resolve) => {
                const countRequest = verifyStore.count();
                countRequest.onsuccess = () => resolve(countRequest.result);
            });

            console.log(`Successfully stored ${verifyCount} records in IndexedDB`);

            statusEl.textContent = `Successfully loaded ${verifyCount} publications!`;
            statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px] bg-green-50 text-green-900';

            // Update UI
            updateRecordCount();
            loadPublications();

            // Clear status after 3 seconds
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px]';
            }, 3000);

            return;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        // File fetch failed (likely file:// protocol)
        console.error('Auto-load failed:', error);
        console.log('Note: Neither embedded data nor CSV file available.');

        statusEl.textContent = 'Unable to load publications data.';
        statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px] bg-red-50 text-red-900';

        // Still load empty state
        loadPublications();
    }
}

// Initialize IndexedDB
function initializeDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('IndexedDB error:', request.error);
            reject(request.error);
        };

        request.onsuccess = async () => {
            db = request.result;
            console.log('IndexedDB opened successfully');

            // Run migration to ensure URLs are set for records with DOIs
            // This is safe to run multiple times as it only updates records that need updating
            await migrateURLs();

            resolve();
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            const oldVersion = event.oldVersion;

            // Delete old object store if it exists (from version 1)
            if (oldVersion < 2 && database.objectStoreNames.contains(STORE_NAME)) {
                database.deleteObjectStore(STORE_NAME);
            }

            // Create object store if it doesn't exist
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = database.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: false
                });

                // Create indexes for efficient querying
                objectStore.createIndex('year', 'year', { unique: false });
                objectStore.createIndex('type_raw', 'type_raw', { unique: false });
                objectStore.createIndex('title', 'title', { unique: false });
                objectStore.createIndex('doi', 'doi', { unique: false });
                objectStore.createIndex('dedup_key', 'dedup_key', { unique: false });
            }
        };
    });
}

// Migrate existing records to ensure URLs are set for records with DOIs
async function migrateURLs() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const records = request.result;
            let updated = 0;
            let processed = 0;

            if (records.length === 0) {
                resolve();
                return;
            }

            records.forEach(record => {
                // Check if record has DOI but no URL
                if (record.doi && (!record.url || !record.url.trim())) {
                    record.url = `https://doi.org/${record.doi}`;
                    const updateRequest = store.put(record);
                    updateRequest.onsuccess = () => {
                        updated++;
                        processed++;
                        if (processed === records.length) {
                            console.log(`Migration complete: Updated ${updated} records with missing URLs`);
                            resolve();
                        }
                    };
                    updateRequest.onerror = () => {
                        processed++;
                        console.error('Error updating record:', updateRequest.error);
                        if (processed === records.length) {
                            resolve();
                        }
                    };
                } else {
                    processed++;
                    if (processed === records.length) {
                        if (updated > 0) {
                            console.log(`Migration complete: Updated ${updated} records with missing URLs`);
                        }
                        resolve();
                    }
                }
            });
        };

        request.onerror = () => {
            console.error('Error during migration:', request.error);
            reject(request.error);
        };
    });
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', handleSearch);
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        loadCSVFromFile(file);
    }
}

// Parse CSV file
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));

    const records = [];

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;

        // Handle CSV parsing with quoted fields
        const values = parseCSVLine(lines[i]);

        if (values.length >= headers.length) {
            const record = {};
            headers.forEach((header, index) => {
                let value = values[index] || '';
                // Clean up the value - remove surrounding quotes
                value = value.trim().replace(/^"|"$/g, '').replace(/""/g, '"');

                // Convert numeric fields
                if (header === 'year' || header === 'score') {
                    value = value ? parseFloat(value) : null;
                }

                record[header] = value;
            });

            // Only add records with a title
            if (record.title && record.title.trim() !== '') {
                records.push(record);
            }
        }
    }

    return records;
}

// Parse CSV line handling quoted fields (including escaped quotes)
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                // Toggle quote state
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    // Add the last value
    values.push(current);
    return values;
}

// Load CSV file from file input and store in IndexedDB
function loadCSVFromFile(file) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = 'Reading CSV file...';
    statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px] bg-mcf-yellow-container text-mcf-yellow-on-container';

    const reader = new FileReader();

    reader.onload = async function(e) {
        try {
            const csvText = e.target.result;
            const records = parseCSV(csvText);

            statusEl.textContent = `Parsed ${records.length} records. Storing in database...`;

            // Store records in IndexedDB
            await storeRecords(records);

            statusEl.textContent = `Successfully loaded ${records.length} publications!`;
            statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px] bg-green-50 text-green-900';

            // Update UI
            updateRecordCount();
            loadPublications();

            // Clear status after 3 seconds
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px]';
            }, 3000);

        } catch (error) {
            console.error('Error processing CSV:', error);
            statusEl.textContent = `Error: ${error.message}`;
            statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px] bg-red-50 text-red-900';
        }
    };

    reader.onerror = function() {
        statusEl.textContent = 'Error reading file';
        statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px] bg-red-50 text-red-900';
    };

    reader.readAsText(file);
}

// Legacy function for backward compatibility (if needed)
async function loadCSV() {
    const fileInput = document.getElementById('csvFileInput');
    if (fileInput && fileInput.files.length > 0) {
        loadCSVFromFile(fileInput.files[0]);
    } else {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = 'Please select a CSV file first';
            statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px] bg-red-50 text-red-900';
        }
    }
}

// Store records in IndexedDB
function storeRecords(records) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        let completed = 0;
        let errors = 0;

        records.forEach((record, index) => {
            // Generate a unique ID for each record to ensure all records are stored
            // This prevents records with the same dedup_key from overwriting each other
            record.id = `record_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;

            // Preserve dedup_key in the record data for reference
            if (!record.dedup_key) {
                record.dedup_key = record.doi || `dedup_${index}`;
            }

            // Ensure URL is set if DOI exists but URL is missing
            if (record.doi && (!record.url || !record.url.trim())) {
                record.url = `https://doi.org/${record.doi}`;
            }

            const request = store.put(record);

            request.onsuccess = () => {
                completed++;
                if (completed + errors === records.length) {
                    resolve();
                }
            };

            request.onerror = () => {
                errors++;
                console.error('Error storing record:', request.error);
                if (completed + errors === records.length) {
                    resolve(); // Continue even if some fail
                }
            };
        });

        if (records.length === 0) {
            resolve();
        }
    });
}

// Load publications from IndexedDB
function loadPublications(page = 1) {
    currentPage = page;

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        let records = request.result;

        // Apply filters
        records = applyFilters(records);

        // Sort by year (most recent first)
        records.sort((a, b) => {
            const yearA = a.year ? parseFloat(a.year) : 0;
            const yearB = b.year ? parseFloat(b.year) : 0;
            // Sort descending (most recent first)
            return yearB - yearA;
        });

        // Apply pagination
        const totalPages = Math.ceil(records.length / recordsPerPage);
        const startIndex = (page - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const paginatedRecords = records.slice(startIndex, endIndex);

        // Display records
        displayPublications(paginatedRecords);

        // Update pagination
        updatePagination(totalPages, page);

        // Update record count
        document.getElementById('recordCount').textContent = records.length;
    };

    request.onerror = () => {
        console.error('Error loading publications:', request.error);
    };
}

// Apply search criteria
function applyFilters(records) {
    const searchInput = document.getElementById('searchInput').value.toLowerCase().trim();

    return records.filter(record => {
        // Search filter - supports multiple terms separated by spaces
        if (searchInput) {
            // Split search input into individual terms
            const searchTerms = searchInput.split(/\s+/).filter(term => term.length > 0);

            if (searchTerms.length > 0) {
                const searchableText = [
                    record.title,
                    record.abstract,
                    record.keywords,
                    record.authors_joined
                ].join(' ').toLowerCase();

                // All terms must be present in the searchable text (AND logic)
                const allTermsMatch = searchTerms.every(term => searchableText.includes(term));

                if (!allTermsMatch) {
                    return false;
                }
            }
        }

        return true;
    });
}

// Get source file category label
function getSourceFileLabel(sourceFile) {
    if (!sourceFile) return null;

    const source = sourceFile.trim();
    if (source === 'Textile Waste') return 'Textile Waste';
    if (source === 'Electronic Waste') return 'Electronic Waste';
    if (source === 'Plastic Waste') return 'Plastic Waste';
    if (source === 'Agrifood Systems') return 'Agrifood Systems';

    return null;
}

// Display publications
function displayPublications(records) {
    const container = document.getElementById('publications');

    if (records.length === 0) {
        container.innerHTML = '<div class="text-center py-20 px-5 text-md-on-surface-variant md-body-large"><p style="font-weight: 500;">No publications found matching your criteria.</p></div>';
        return;
    }

    container.innerHTML = records.map(record => {
        const sourceLabel = getSourceFileLabel(record.source_file);

        return `
        <div class="md-card md-state-layer p-6 md:p-8 cursor-pointer">
            <div class="flex justify-between items-start mb-4 md:mb-5 gap-4">
                <div class="md-title-large text-md-on-surface mb-2 md:mb-3 flex-1" style="font-weight: 500;">
                    ${escapeHtml(record.title || 'Untitled')}
                </div>
            </div>
            <div class="flex gap-2 md:gap-3 flex-wrap items-center md-label-large text-md-on-surface-variant mb-3 md:mb-4">
                ${record.year ? `<span class="flex items-center gap-1.5"><strong class="font-medium text-md-on-surface">Year:</strong> ${Math.floor(parseFloat(record.year))}</span>` : ''}
                ${record.type_raw ? `<span class="md-chip">${escapeHtml(record.type_raw)}</span>` : ''}
                ${record.ris_type ? `<span class="flex items-center gap-1.5"><strong class="font-medium text-md-on-surface">Type:</strong> ${escapeHtml(record.ris_type)}</span>` : ''}
                ${sourceLabel ? `<span class="md-chip md-chip-orange">${escapeHtml(sourceLabel)}</span>` : ''}
            </div>
            ${record.authors_joined ? `<div class="mt-2 md:mt-3 text-md-on-surface-variant italic md-body-large mb-2" style="font-weight: 500;">${escapeHtml(record.authors_joined)}</div>` : ''}
            ${record.abstract ? `<div class="text-md-on-surface leading-relaxed mt-3 md:mt-4 md-body-large line-clamp-5">${escapeHtml(record.abstract)}</div>` : ''}
            <div class="flex gap-2 md:gap-3 flex-wrap items-center md-label-large text-md-on-surface-variant mt-3 md:mt-4">
                ${(record.doi || record.url) ? `<a href="${escapeHtml(record.url || (record.doi ? `https://doi.org/${record.doi}` : '#'))}" target="_blank" class="text-mcf-red font-medium no-underline hover:opacity-80 transition-opacity duration-200 inline-flex items-center gap-1.5 hover:gap-2 md-state-layer">View Publication →</a>` : ''}
            </div>
        </div>
        `;
    }).join('');
}

// Update pagination controls
function updatePagination(totalPages, currentPage) {
    const paginationEl = document.getElementById('pagination');

    if (totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button - Material Design 3 Outlined Button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="loadPublications(${currentPage - 1})" class="md-state-layer px-4 py-2 border border-md-outline bg-md-surface rounded-full md-label-large text-md-on-surface min-w-[44px] transition-all duration-200 hover:border-mcf-red hover:text-mcf-red disabled:opacity-38 disabled:cursor-not-allowed disabled:hover:border-md-outline disabled:hover:text-md-on-surface" style="font-weight: 500;">Previous</button>`;

    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        html += `<button onclick="loadPublications(1)" class="md-state-layer px-4 py-2 border border-md-outline bg-md-surface rounded-full md-label-large text-md-on-surface min-w-[44px] transition-all duration-200 hover:border-mcf-red hover:text-mcf-red" style="font-weight: 500;">1</button>`;
        if (startPage > 2) {
            html += `<button disabled class="px-4 py-2 border border-md-outline bg-md-surface rounded-full md-label-large text-md-on-surface min-w-[44px] opacity-38 cursor-not-allowed" style="font-weight: 500;">...</button>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `<button onclick="loadPublications(${i})" class="md-state-layer ${isActive ? 'bg-mcf-red text-white border-mcf-red shadow-md-elevation-1' : 'border border-md-outline bg-md-surface text-md-on-surface hover:border-mcf-red hover:text-mcf-red'} px-4 py-2 rounded-full md-label-large min-w-[44px] transition-all duration-200" style="font-weight: 500;">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<button disabled class="px-4 py-2 border border-md-outline bg-md-surface rounded-full md-label-large text-md-on-surface min-w-[44px] opacity-38 cursor-not-allowed" style="font-weight: 500;">...</button>`;
        }
        html += `<button onclick="loadPublications(${totalPages})" class="md-state-layer px-4 py-2 border border-md-outline bg-md-surface rounded-full md-label-large text-md-on-surface min-w-[44px] transition-all duration-200 hover:border-mcf-red hover:text-mcf-red" style="font-weight: 500;">${totalPages}</button>`;
    }

    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="loadPublications(${currentPage + 1})" class="md-state-layer px-4 py-2 border border-md-outline bg-md-surface rounded-full md-label-large text-md-on-surface min-w-[44px] transition-all duration-200 hover:border-mcf-red hover:text-mcf-red disabled:opacity-38 disabled:cursor-not-allowed disabled:hover:border-md-outline disabled:hover:text-md-on-surface" style="font-weight: 500;">Next</button>`;

    paginationEl.innerHTML = html;
}

// Update record count
function updateRecordCount() {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const countRequest = store.count();

    countRequest.onsuccess = () => {
        document.getElementById('recordCount').textContent = countRequest.result;
    };
}

// Handle search
function handleSearch() {
    loadPublications(1);
}

// Clear database (internal function, returns Promise)
function clearDatabaseInternal() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
            console.log('Database cleared successfully');
            resolve();
        };

        request.onerror = () => {
            console.error('Error clearing database:', request.error);
            reject(request.error);
        };
    });
}

// Clear database (user-facing function with confirmation)
function clearDatabase() {
    if (!confirm('Are you sure you want to clear all publications from the database?')) {
        return;
    }

    clearDatabaseInternal().then(() => {
        const statusEl = document.getElementById('status');
        statusEl.textContent = 'Database cleared successfully!';
        statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px] bg-green-50 text-green-900';
        updateRecordCount();
        document.getElementById('publications').innerHTML =
            '<div class="text-center py-20 px-5 text-md-on-surface-variant md-body-large"><p style="font-weight: 500;">Loading publications...</p></div>';
        document.getElementById('pagination').innerHTML = '';

        setTimeout(() => {
            statusEl.textContent = '';
            statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px]';
        }, 3000);
    }).catch(() => {
        const statusEl = document.getElementById('status');
        statusEl.textContent = 'Error clearing database!';
        statusEl.className = 'px-4 md:px-5 py-2.5 md:py-3 rounded-full md-label-large min-w-[180px] md:min-w-[200px] bg-red-50 text-red-900';
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
