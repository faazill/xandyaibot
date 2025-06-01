const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');
const axios = require('axios');
const cheerio = require('cheerio');
const pdf = require('pdf-parse');

// Create CSV writer
const csvWriter = createObjectCsvWriter({
    path: 'college_details.csv',
    header: [
        { id: 'College Name', title: 'College Name' },
        { id: 'Established', title: 'Established' },
        { id: 'Location', title: 'Location' },
        { id: 'Type', title: 'Type' },
        { id: 'Departments', title: 'Departments' },
        { id: 'Student Strength', title: 'Student Strength' },
        { id: 'Faculty Count', title: 'Faculty Count' },
        { id: 'Campus Area', title: 'Campus Area' },
        { id: 'Labs', title: 'Labs' },
        { id: 'Library', title: 'Library' },
        { id: 'NAAC', title: 'NAAC' },
        { id: 'NBA', title: 'NBA' },
        { id: 'Rankings', title: 'Rankings' },
        { id: 'Placement Percentage', title: 'Placement Percentage' },
        { id: 'Average Package', title: 'Average Package' },
        { id: 'Top Companies', title: 'Top Companies' },
        { id: 'Research Centers', title: 'Research Centers' },
        { id: 'Publications', title: 'Publications' },
        { id: 'Patents', title: 'Patents' },
        { id: 'Sports Facilities', title: 'Sports Facilities' },
        { id: 'Hostel Facilities', title: 'Hostel Facilities' },
        { id: 'Transport Facilities', title: 'Transport Facilities' }
    ]
});

// Function to validate and format URL
function formatUrl(url) {
    if (!url) return null;
    
    // Remove any whitespace
    url = url.trim();
    
    // If URL doesn't start with http:// or https://, add https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    try {
        new URL(url);
        return url;
    } catch (error) {
        console.error('Invalid URL format:', url);
        return null;
    }
}

// Function to extract data from PDF
async function extractCollegeData(url, collegeName) {
    try {
        const formattedUrl = formatUrl(url);
        if (!formattedUrl) {
            console.error(`Invalid URL for ${collegeName}: ${url}`);
            return null;
        }

        console.log(`Fetching PDF from: ${formattedUrl}`);
        const response = await axios.get(formattedUrl, {
            timeout: 10000, // 10 second timeout
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        // Parse PDF content
        const pdfData = await pdf(response.data);
        const text = pdfData.text.toLowerCase();
        
        // Initialize data object with default values
        const data = {
            'College Name': collegeName,
            'Established': 'Not available',
            'Location': 'Not available',
            'Type': 'Not available',
            'Departments': 'Not available',
            'Student Strength': 'Not available',
            'Faculty Count': 'Not available',
            'Campus Area': 'Not available',
            'Labs': 'Not available',
            'Library': 'Not available',
            'NAAC': 'Not available',
            'NBA': 'Not available',
            'Rankings': 'Not available',
            'Placement Percentage': 'Not available',
            'Average Package': 'Not available',
            'Top Companies': 'Not available',
            'Research Centers': 'Not available',
            'Publications': 'Not available',
            'Patents': 'Not available',
            'Sports Facilities': 'Not available',
            'Hostel Facilities': 'Not available',
            'Transport Facilities': 'Not available'
        };

        // Extract data using patterns
        // Extract establishment year
        const establishedMatch = text.match(/established in (\d{4})/i);
        if (establishedMatch) data['Established'] = establishedMatch[1];

        // Extract location
        const locationMatch = text.match(/located in ([^.,]+)/i);
        if (locationMatch) data['Location'] = locationMatch[1].trim();

        // Extract type
        if (text.includes('government')) data['Type'] = 'Government';
        else if (text.includes('private')) data['Type'] = 'Private';
        else if (text.includes('autonomous')) data['Type'] = 'Autonomous';

        // Extract departments
        const departments = [];
        const deptMatches = text.match(/department[s]? of ([^.,]+)/gi);
        if (deptMatches) {
            departments.push(...deptMatches.map(dept => dept.replace(/department[s]? of /i, '').trim()));
        }
        if (departments.length > 0) data['Departments'] = departments.join(', ');

        // Extract student strength
        const strengthMatch = text.match(/(\d+)\s*(?:students|enrolled)/i);
        if (strengthMatch) data['Student Strength'] = strengthMatch[1];

        // Extract faculty count
        const facultyMatch = text.match(/(\d+)\s*(?:faculty|teachers|professors)/i);
        if (facultyMatch) data['Faculty Count'] = facultyMatch[1];

        // Extract campus area
        const areaMatch = text.match(/(\d+)\s*(?:acres|hectares|sq\.?\s*ft\.?)/i);
        if (areaMatch) data['Campus Area'] = areaMatch[0];

        // Extract labs
        const labMatches = text.match(/laboratory[s]?[^.,]+/gi);
        if (labMatches) data['Labs'] = labMatches.join(', ');

        // Extract library info
        const libraryMatch = text.match(/library[^.,]+/i);
        if (libraryMatch) data['Library'] = libraryMatch[0];

        // Extract NAAC/NBA info
        const naacMatch = text.match(/naac[^.,]+/i);
        if (naacMatch) data['NAAC'] = naacMatch[0];
        const nbaMatch = text.match(/nba[^.,]+/i);
        if (nbaMatch) data['NBA'] = nbaMatch[0];

        // Extract rankings
        const rankingMatch = text.match(/rank(?:ed|ing)[^.,]+/i);
        if (rankingMatch) data['Rankings'] = rankingMatch[0];

        // Extract placement info
        const placementMatch = text.match(/(\d+)%\s*(?:placement|placed)/i);
        if (placementMatch) data['Placement Percentage'] = placementMatch[1] + '%';
        const packageMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lpa|lakh|package)/i);
        if (packageMatch) data['Average Package'] = packageMatch[1] + ' LPA';

        // Extract companies
        const companyMatches = text.match(/companies?[^.,]+/gi);
        if (companyMatches) data['Top Companies'] = companyMatches.join(', ');

        // Extract research info
        const researchMatch = text.match(/research[^.,]+/i);
        if (researchMatch) data['Research Centers'] = researchMatch[0];
        const publicationsMatch = text.match(/(\d+)\s*(?:publications|papers)/i);
        if (publicationsMatch) data['Publications'] = publicationsMatch[1];
        const patentsMatch = text.match(/(\d+)\s*(?:patents|patented)/i);
        if (patentsMatch) data['Patents'] = patentsMatch[1];

        // Extract facilities
        const sportsMatch = text.match(/sports[^.,]+/i);
        if (sportsMatch) data['Sports Facilities'] = sportsMatch[0];
        const hostelMatch = text.match(/hostel[^.,]+/i);
        if (hostelMatch) data['Hostel Facilities'] = hostelMatch[0];
        const transportMatch = text.match(/transport[^.,]+/i);
        if (transportMatch) data['Transport Facilities'] = transportMatch[0];

        return data;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error(`Connection refused for ${collegeName}: ${url}`);
        } else if (error.code === 'ETIMEDOUT') {
            console.error(`Connection timed out for ${collegeName}: ${url}`);
        } else if (error.response) {
            console.error(`HTTP Error ${error.response.status} for ${collegeName}: ${url}`);
        } else {
            console.error(`Error fetching data for ${collegeName}: ${error.message}`);
        }
        return null;
    }
}

// Main function to process all colleges
async function processColleges() {
    const colleges = [];
    const results = [];
    const failedColleges = [];

    try {
        // Read seats.csv
        await new Promise((resolve, reject) => {
            fs.createReadStream('seats.csv')
                .pipe(csv())
                .on('data', (data) => {
                    // Debug the data structure
                    console.log('CSV Row:', data);
                    colleges.push(data);
                })
                .on('end', () => {
                    console.log('\nCSV Headers:', Object.keys(colleges[0] || {}));
                    resolve();
                })
                .on('error', reject);
        });

        if (colleges.length === 0) {
            console.error('No colleges found in the CSV file');
            return;
        }

        // Process each college
        for (const college of colleges) {
            console.log(`\nProcessing ${college['College Name']}...`);
            
            // Debug the college data
            console.log('College data:', college);
            
            // Try different possible column names for the URL
            const url = college['PDF Link'] || college['Link'] || college['Website'] || college['URL'];
            
            const data = await extractCollegeData(url, college['College Name']);
            
            if (data) {
                results.push(data);
                // Write to CSV after each successful fetch
                await csvWriter.writeRecords([data]);
                console.log(`✓ Completed ${college['College Name']}`);
            } else {
                failedColleges.push(college['College Name']);
                console.log(`✗ Failed to process ${college['College Name']}`);
            }
            
            // Add delay to avoid overwhelming servers
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\nProcessing complete!');
        console.log(`Successfully processed: ${results.length} colleges`);
        if (failedColleges.length > 0) {
            console.log('\nFailed to process the following colleges:');
            failedColleges.forEach(college => console.log(`- ${college}`));
        }
    } catch (error) {
        console.error('Error processing colleges:', error);
    }
}

// Run the script
processColleges().catch(console.error); 