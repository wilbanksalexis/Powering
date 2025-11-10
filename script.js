// Initialize variables
let map;
let markers = [];
let dataCenters = [];
let markerLayer;
let tooltipsMap = {};

function displayMarkers(filter = 'all') {
    // Clear existing markers
    markerLayer.clearLayers();
    markers = [];

    // Filter data centers
    const filtered = filter === 'all' 
        ? dataCenters 
        : dataCenters.filter(dc => dc.company === filter);

    // Update count
    document.getElementById('locationCount').textContent = filtered.length;

    // Add new markers
    filtered.forEach(dc => {
        const cityKey = `${dc.city}, ${dc.state}`;
        const tooltipData = tooltipsMap[cityKey];
        
        let popupContent = `
            <div class="popup-content">
                <h3>${dc.company}</h3>
                <p><strong>${dc.site}</strong></p>
                <p>${dc.city}, ${dc.state}</p>
        `;
        
        if (tooltipData) {
            popupContent += `
                <div class="popup-details">
                    <div class="tooltip-section">
                        <h4>Environmental Impact</h4>
                        <p>${tooltipData.tooltips.environmental}</p>
                    </div>
                    <div class="tooltip-section">
                        <h4>Policy Response</h4>
                        <p>${tooltipData.tooltips.policy}</p>
                    </div>
                    <div class="tooltip-section">
                        <h4>Community Voice</h4>
                        <p>${tooltipData.tooltips.community}</p>
                    </div>
                </div>
            `;
        }
        
        popupContent += '</div>';
        
        // Create custom markers based on whether tooltip data exists
        const greyIcon = L.divIcon({
            className: 'custom-marker grey',
            html: '<div class="marker-dot"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        const blueIcon = L.divIcon({
            className: 'custom-marker blue',
            html: '<div class="marker-dot"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        const marker = L.marker([dc.latitude, dc.longitude], {
            icon: tooltipData ? blueIcon : greyIcon
        }).bindPopup(popupContent, {
            maxWidth: 400,
            className: 'custom-popup'
        });
            
        markers.push(marker);
        markerLayer.addLayer(marker);
    });

    // If filtering, fit bounds to shown markers
    if (filter !== 'all' && markers.length > 0) {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
    } else {
        map.setView([39.8283, -98.5795], 4);
    }
}

async function initMap() {
    try {
        // Create the map centered on US
        map = L.map('mapContainer').setView([39.8283, -98.5795], 4);
        
        // Add the tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Create a layer group for markers
        markerLayer = L.layerGroup().addTo(map);

        // Show loading message
        document.querySelector('.map-legend').innerHTML = '<p>Loading data centers...</p>';
        
        // Fetch both JSON files
        console.log('Fetching data...');
        const [dataCentersResponse, tooltipsResponse] = await Promise.all([
            fetch('./assets/data_centers.json'),
            fetch('./assets/city_tooltip_blurbs_map.json')
        ]);
        
        if (!dataCentersResponse.ok || !tooltipsResponse.ok) {
            throw new Error(`HTTP error! status: ${dataCentersResponse.status} ${tooltipsResponse.status}`);
        }
        
        // Parse both JSON files
        dataCenters = await dataCentersResponse.json();
        const tooltips = await tooltipsResponse.json();
        
        // Create a map of city tooltips for quick lookup
        tooltipsMap = tooltips.reduce((acc, item) => {
            acc[item.city] = item;
            return acc;
        }, {});

        // Initial display of markers
        displayMarkers('all');
        
        // Update the filter dropdown
        const uniqueCompanies = [...new Set(dataCenters.map(dc => dc.company))].sort();
        const filterSelect = document.getElementById('companyFilter');
        filterSelect.innerHTML = '<option value="all">All Companies</option>';
        uniqueCompanies.forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company;
            filterSelect.appendChild(option);
        });
        
        // Update the legend
        document.querySelector('.map-legend').innerHTML = '<p>Click markers to see data center details</p>';
        
    } catch (error) {
        console.error('Error loading data centers:', error);
        document.querySelector('.map-legend').innerHTML = `<p class="error">Error: ${error.message}</p>`;
        document.getElementById('locationCount').textContent = '0';
    }
}

// AI Chat functionality
const impactResponses = {
    'virginia': {
        environmental: `In Virginia, particularly in the data center hub of Northern Virginia:
        • Power Usage: Data centers consume over 4.5 gigawatts of power annually
        • Water Impact: Cooling systems use millions of gallons daily
        • Green Initiatives: Some facilities are transitioning to renewable energy
        • Environmental Concerns: Habitat disruption and increased energy grid strain
        • Noise Pollution: Cooling systems create constant background noise for nearby residents`,
        social: `Community impacts in Virginia's data center regions include:
        • Property Value Changes: Mixed effects on nearby residential areas
        • Job Creation: Over 45,000 direct and indirect jobs
        • Infrastructure Strain: Increased traffic and utility demands
        • Tax Revenue: Significant local tax benefits, but questions about fair distribution
        • Community Division: Debates over future development and environmental justice`
    },
    'phoenix': {
        environmental: `Phoenix data center environmental analysis:
        • Water Scarcity: Critical concerns about water usage in desert climate
        • Heat Island Effect: Large facilities contribute to urban heating
        • Energy Grid: Heavy demand on local power infrastructure
        • Air Quality: Diesel generator emissions during peak usage
        • Land Use: Converting agricultural land to industrial use`,
        social: `Social justice concerns in Phoenix include:
        • Water Rights: Competition with residential and agricultural needs
        • Environmental Justice: Facility placement often near disadvantaged communities
        • Economic Benefits: Questions about equitable distribution of tax revenue
        • Community Voice: Calls for greater involvement in planning decisions
        • Indigenous Rights: Impact on traditional lands and water resources`
    },
    'chicago': {
        environmental: `Chicago data center environmental impact:
        • Energy Consumption: High demand on regional power grid
        • Lake Michigan: Water usage impacts on Great Lakes ecosystem
        • Urban Heat: Contribution to city heat island effect
        • Air Quality: Emissions from backup power systems
        • Weather Resilience: Adaptation to extreme temperature variations`,
        social: `Chicago's community response to data centers:
        • Urban Development: Integration with city planning initiatives
        • Job Training: Local workforce development programs
        • Community Benefits: Infrastructure improvements and public space projects
        • Noise Concerns: Residential areas affected by cooling systems
        • Economic Impact: Changes in neighborhood character and property values`
    }
};

function generateResponse(query) {
    query = query.toLowerCase();
    let response = '';

    // Check for location mentions
    const locations = {
        'virginia': 'virginia',
        'phoenix': 'phoenix',
        'chicago': 'chicago'
    };

    let location = null;
    Object.keys(locations).forEach(loc => {
        if (query.includes(loc)) {
            location = locations[loc];
        }
    });

    if (!location) {
        return `I can provide specific information about data center impacts in Virginia, Phoenix, or Chicago. Please ask about one of these locations.`;
    }

    // Determine if query is about environmental or social impact
    const isEnvironmental = query.includes('environment') || query.includes('ecological') || query.includes('climate');
    const isSocial = query.includes('social') || query.includes('community') || query.includes('justice');

    if (isEnvironmental && isSocial) {
        response = impactResponses[location].environmental + '\n\n' + impactResponses[location].social;
    } else if (isEnvironmental) {
        response = impactResponses[location].environmental;
    } else if (isSocial) {
        response = impactResponses[location].social;
    } else {
        response = impactResponses[location].environmental + '\n\n' + impactResponses[location].social;
    }

    return response;
}

function addMessage(text, type) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Initialize everything when the document loads
document.addEventListener('DOMContentLoaded', function () {
    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
        initMap();
    }

    // Set up filter change handler
    const filterSelect = document.getElementById('companyFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => displayMarkers(e.target.value));
    }

    // Set up chat form handler
    const chatForm = document.getElementById('chatForm');
    if (chatForm) {
        chatForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const input = document.getElementById('chatInput');
            const query = input.value.trim();
            
            if (query) {
                // Add user message
                addMessage(query, 'user');
                
                // Generate and add AI response
                setTimeout(() => {
                    const response = generateResponse(query);
                    addMessage(response, 'ai');
                }, 500);
                
                // Clear input
                input.value = '';
            }
        });

        // Add click handlers for example questions
        document.querySelectorAll('.message.system li').forEach(li => {
            li.addEventListener('click', function() {
                const query = this.textContent;
                document.getElementById('chatInput').value = query;
            });
        });
    }
});