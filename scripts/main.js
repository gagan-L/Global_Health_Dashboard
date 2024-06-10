document.addEventListener('DOMContentLoaded', function() {
    Promise.all([
        d3.csv('./Dataset/Dataset.csv'), 
        d3.json('./GeoJson/world.geojson') 
    ]).then(function(loadData) {
        let data = loadData[0];
        let geojsonData = loadData[1];
        
        // Creating a lookup map of country names to HAQ Index values for a given year
        function createHaqIndexLookup(year, haqData) {
            let lookup = new Map();
            haqData.forEach(function(d) {
                if (d.year_id === year && d.indicator_name === 'HAQ Index') {
                    lookup.set(d.location_name, +d.val);
                }
            });
            return lookup;
        }

        // Defining color scale
        let colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain(d3.extent(data, d => +d.val)); 

        // Getting the width and height of container1
        let container = document.getElementById('container1');
        let width = container.clientWidth;
        let height = container.clientHeight;

        let tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);

        // Creating SVG element and group for zooming
        let svg = d3.select('#container1').append('svg')
        .attr('width', width)
        .attr('height', height);
        let g = svg.append('g');
        

        // Defining the zoom behavior
        var zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on('zoom', function (event) {
            // Apply translation and scaling during zoom
            g.attr('transform', event.transform);
        });

        let zoomControls = svg.append('g')
        .attr('class', 'zoom-controls')
        .attr('transform', 'translate(' + (width - 60) + ', 10)'); 
        zoomControls.append('rect')
        .attr('class', 'zoom-in')
        .attr('width', 40)
        .attr('height', 40)
        .attr('x', 0)
        .attr('y', 0)
        .on('click', zoomIn);

        zoomControls.append('text')
        .attr('x', 20) 
        .attr('y', 20) 
        .attr('text-anchor', 'middle') 
        .attr('dominant-baseline', 'middle') 
        .attr('font-size', '30px')
        .attr('fill', 'white')
        .text('+')
        .on('click', zoomIn);

    // Zoom Out Button
    zoomControls.append('rect')
        .attr('class', 'zoom-out')
        .attr('width', 40)
        .attr('height', 40)
        .attr('x', 0)
        .attr('y', 50)
        .on('click', zoomOut);

        zoomControls.append('text')
        .attr('x', 20) 
        .attr('y', 70) 
        .attr('text-anchor', 'middle') 
        .attr('dominant-baseline', 'middle') 
        .attr('font-size', '30px')
        .attr('pointer-events', 'none') 
        .attr('fill', 'white')
        .text('-');


    function zoomIn() {
        svg.transition().call(zoom.scaleBy, 2);
    }

    function zoomOut() {
        svg.transition().call(zoom.scaleBy, 0.5);
    }

    svg.call(zoom);

        // Creating projection and path
        let projection = d3.geoNaturalEarth1().fitSize([width, height], geojsonData);
        let path = d3.geoPath().projection(projection);

    
        let countries = g.selectAll('path')
            .data(geojsonData.features)
            .enter().append('path')
            .attr('d', path)
            .attr('fill', '#ccc') 
            .on('click', handleCountryClick)
            .on('mouseover', function(event, d) {
                tooltip.transition()
                    .duration(200)
                    .style('opacity', 0.9);
                tooltip.html(d.properties.NAME) 
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY + 10) + 'px');
            })
            .on('mouseout', function() {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });


        function updateMap(year) {
            let haqIndexLookup = createHaqIndexLookup(year, data);

            countries.transition()
                .duration(500)
                .attr('fill', function(d) {
                    let haqValue = haqIndexLookup.get(d.properties.NAME);
                    return haqValue ? colorScale(haqValue) : '#ccc';
                });
        }

        // Function to draw the pie chart for HAQ Index distribution
        function drawPieChart(countryName) {
            
            const filteredData = data.filter(d => d.location_name === countryName && d.year_id === '2019');
            const values = { Young: 0, Working: 0, Postworking: 0 };
            filteredData.forEach(d => {
                if (["Young", "Working", "Postworking"].includes(d.haq_index_age_type) && d.indicator_name === "HAQ Index") {
                    values[d.haq_index_age_type] += +d.val;
                }
            });

            const width = 250, height = 250, radius = Math.min(width, height) / 2;
            const padding = { top: 100, bottom: 80};
            const color = d3.scaleOrdinal(["#477bcb", "#6c95d5", "#91b0e0"]); 
            const svgHeight = height + padding.top + padding.bottom;

            d3.select("#container4").html("");

            const svg = d3.select("#container4").append("svg")
                .attr("width", width)
                .attr("height", svgHeight)
                .append("g")
                .attr('transform', `translate(${width / 2},${radius + padding.top})`);

            svg.append("text")
                .attr("x", 0)
                .attr("y", -180)
                .attr("text-anchor", "middle")
                .style("font-size", "20px")
                .text("HAQ BY LIFE STAGES")
                .style("fill", "white");

            const pie = d3.pie().value(function(d) { return d.value; });

            const data_ready = pie(Object.entries(values).map(([key, value]) => ({ key, value })));

            const arcGenerator = d3.arc()
                .innerRadius(0)
                .outerRadius(radius);

            const pieTooltip = d3.select('body').append('div')
                .attr('class', 'tooltip-pie') 
                .style('opacity', 0)
                .style('position', 'absolute')
                .style('padding', '12px')
                .style('background', 'rgba(0, 0, 0, 0.6)')
                .style('border-radius', '10px')
                .style('color', '#fff')
                .style('pointer-events', 'none');

            svg.selectAll('path')
                .data(data_ready)
                .enter()
                .append('path')
                .attr('d', arcGenerator) 
                .attr('fill', function(d) { return color(d.data.key); })
                .attr("stroke", "black")
                .style("stroke-width", "1px")
                .style("opacity", 0.7)
                .on('mouseover', function(event, d) {
                    pieTooltip.transition()
                        .duration(200)
                        .style('opacity', 0.9);
                    pieTooltip.html(`
                        <div>Age Type: ${d.data.key}</div> 
                        <div>Country: ${countryName}</div>
                        <div>HAQ Index: ${d.data.value.toFixed(2)}</div>`)
                        .style('left', (event.pageX) + 'px')
                        .style('top', (event.pageY - 28) + 'px');
                })
                .on('mouseout', function(d) {
                    pieTooltip.transition()
                        .duration(500)
                        .style('opacity', 0);
                });

                const legendGroup = svg.append('g')
                    .attr('transform', `translate(${-width / 2},${height / 2 + 30})`); 
        
                const legend = legendGroup.selectAll('.legend')
                    .data(color.domain())
                    .enter().append('g')
                    .attr('class', 'legend')
                    .attr('transform', (d, i) => `translate(${i * 80}, 0)`); 
            
                legend.append('rect')
                    .attr('x', 8) 
                    .attr('y', 17) 
                    .attr('width', 10) 
                    .attr('height', 10)
                    .style('fill', color);
            
                legend.append('text')
                    .attr('x', 25)
                    .attr('y', 22)
                    .attr('font-size', '12px')
                    .attr('fill', 'white')
                    .attr('dy', '.35em')
                    .text(d => d);
        }
        drawPieChart('India');

        //Function to draw Bar Chart 
        function drawBarChart(countryName) {
            
            const filteredData = data.filter(d => 
                d.location_name === countryName && 
                d.year_id === '2019' &&
                ["Breast cancer", "Cervical cancer", "Uterine cancer", "Colon and rectum cancer", "Testicular cancer"].includes(d.indicator_name)
            );
        
            d3.select("#container5").html("");

            const margin = {top: 110, right: 30, bottom: 120, left: 80},
                width = 420 - margin.left - margin.right,
                height = 450 - margin.top - margin.bottom;

            const svg = d3.select("#container5")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            svg.append("text")
                .attr("x", width/2)
                .attr("y", -70)
                .attr("text-anchor", "middle")
                .style("font-size", "20px")
                .text("CANCER STATISTICS")
                .style("fill", "white");

            const gradient = svg.append("defs")
                .append("linearGradient")
                .attr("id", "barGradient")
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", "0%")
                .attr("y1", "0%")
                .attr("x2", "0%")
                .attr("y2", "100%");

            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", "#a7c0e6"); 

            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", "#000000");

            const indicatorNameMapping = {
                "Breast cancer": "Breast",
                "Cervical cancer": "Cervical",
                "Uterine cancer": "Uterine",
                "Colon and rectum cancer": "Colon & Rectum",
                "Testicular cancer": "Testicular"
            };

            const x = d3.scaleBand()
                .range([ 0, width ])
                .domain(filteredData.map(d => indicatorNameMapping[d.indicator_name] || d.indicator_name))
                .padding(0.2);
            svg.append("g")
                .attr("transform", `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll("text")
                .attr("transform", "translate(-10,0)rotate(-45)")
                .style("text-anchor", "end")
                .style("fill", "white")
                .style("font-size", "12px");

            const y = d3.scaleLinear()
                .domain([0, d3.max(filteredData, d => +d.val)])
                .range([ height, 0]);
            svg.append("g")
                .call(d3.axisLeft(y))
                .selectAll("text") 
                .style("fill", "white");

            svg.selectAll("mybar")
                .data(filteredData)
                .enter()
                .append("rect")
                .attr("x", d => x(indicatorNameMapping[d.indicator_name] || d.indicator_name))
                .attr("y", d => y(d.val))
                .attr("width", x.bandwidth())
                .attr("height", d => height - y(d.val))
                .attr("fill", "url(#barGradient)");
        }
        drawBarChart('India');

        //Function to get top 5 diseases for dumbbell plot
        function getTopDiseasesData(countryName) {
            
            const data1990 = data.filter(d => 
                d.location_name === countryName && d.year_id === '1990' && d.indicator_name !== 'HAQ Index');
            const data2019 = data.filter(d => 
                d.location_name === countryName && d.year_id === '2019' && d.indicator_name !== 'HAQ Index');
        
            
            let diseasesMap = new Map();
        
            data1990.forEach(d => {
                diseasesMap.set(d.indicator_name, {
                    name: d.indicator_name,
                    '1990': +d.val,
                    '2019': 0 
                });
            });
        
            data2019.forEach(d => {
                if (diseasesMap.has(d.indicator_name)) {
                    diseasesMap.get(d.indicator_name)['2019'] = +d.val;
                } else {
                    diseasesMap.set(d.indicator_name, {
                        name: d.indicator_name,
                        '1990': 0, 
                        '2019': +d.val
                    });
                }
            });
        
            const sortedDiseases = Array.from(diseasesMap.values())
                .sort((a, b) => (b['1990'] + b['2019']) - (a['1990'] + a['2019']))
                .slice(0, 5); 
        
            return sortedDiseases;
        }

        //Function to Draw Dumbbell plot
        function drawDumbbellPlot(preparedData, countryName) {
            const container = d3.select("#container6");
            container.selectAll("*").remove(); 
        
            const margin = { top: 70, right: 30, bottom: 20, left: 70 },
                width = 360 - margin.left - margin.right,
                height = 360 - margin.top - margin.bottom;
        
            const svg = container.append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom + 80)
                .append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            svg.append("text")
                .attr("x", width/2)
                .attr("y", -30)
                .attr("text-anchor", "middle")
                .style("font-size", "20px")
                .text("DISEASE IMPACT EVOLUTION")
                .style("fill", "white");
        
            const xScale = d3.scaleBand()
                .range([0, width]) 
                .domain(preparedData.map(d => d.name))
                .padding(0.4);
        
            const yScale = d3.scaleLinear()
                .domain([0, d3.max(preparedData, d => Math.max(d['1990'], d['2019']))])
                .nice() 
                .range([height, 0]);
        
            svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(xScale))
                .selectAll("text")
                .attr("transform", "translate(0,0)rotate(-45)")
                .style("text-anchor", "end")
                .style("fill", "white")
                .style("font-size", "10.5px");
        
            svg.append("g")
                .call(d3.axisLeft(yScale))
                .selectAll("text")
                .style("fill", "white")
                .style("font-size", "11px");
        
            svg.selectAll(".line")
                .data(preparedData)
                .join("line")
                .attr("class", "line")
                .attr("x1", d => xScale(d.name) + xScale.bandwidth() / 2) 
                .attr("x2", d => xScale(d.name) + xScale.bandwidth() / 2) 
                .attr("y1", d => yScale(d['1990'])) 
                .attr("y2", d => yScale(d['2019'])) 
                .attr("stroke", "grey")
                .attr("stroke-width", 4);
        
            svg.selectAll(".circle1990")
                .data(preparedData)
                .join("circle")
                .attr("class", "circle1990")
                .attr("cx", d => xScale(d.name) + xScale.bandwidth() / 2) 
                .attr("cy", d => yScale(d['1990'])) 
                .attr("r", 8)
                .attr("fill", "#377eb8");
        
            svg.selectAll(".circle2019")
                .data(preparedData)
                .join("circle")
                .attr("class", "circle2019")
                .attr("cx", d => xScale(d.name) + xScale.bandwidth() / 2) 
                .attr("cy", d => yScale(d['2019'])) 
                .attr("r", 8)
                .attr("fill", "#4daf4a");
        } 
        
        function handleCountryClick(event, countryFeature) {
            
            const countryName = countryFeature.properties.NAME;
            const haqIndex1990 = data.find(d => d.location_name === countryName && d.year_id === '1990');
            const haqIndex2019 = data.find(d => d.location_name === countryName && d.year_id === '2019');
        
            updateCircularIndicator('inner-container1', haqIndex1990 ? parseFloat(haqIndex1990.val) : 0);
            updateCircularIndicator('inner-container2', haqIndex2019 ? parseFloat(haqIndex2019.val) : 0);
            drawPieChart(countryName);
            drawBarChart(countryName);

            let preparedData = getTopDiseasesData(countryName);
            if (preparedData.length > 0) {
                drawDumbbellPlot(preparedData, countryName);
            } else {
                console.warn(`No data available for ${countryName} to draw the dumbbell plot.`);
                d3.select("#container6").selectAll("*").remove();
                d3.select("#container6").append("text")
                    .attr("x", "50%")
                    .attr("y", "50%")
                    .attr("text-anchor", "middle")
                    .text("No data available");
            }

    }

    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }
    
    function describeArc(x, y, radius, startAngle, endAngle) {
        var start = polarToCartesian(x, y, radius, endAngle);
        var end = polarToCartesian(x, y, radius, startAngle);
        var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
        var d = [
            "M", start.x, start.y, 
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
        ].join(" ");
        return d;       
    }
    
    function updateCircularIndicator(containerId, value) {
        let normalizedValue = value / 100; 
        let angle = normalizedValue * 180; 

        let arcColor = 'blue'; 
        if (value >= 80) {
            arcColor = "red";
        } else if (value >= 60) {
            arcColor = "orange";
        } else if (value >= 30) {
            arcColor = "yellow";
        } else {
            arcColor = "green";
        }
    
        let arcPath = d3.select(`#${containerId} .indicator-arc`);
        let needle = d3.select(`#${containerId} .indicator-needle`);
        let textElement = d3.select(`#${containerId} .indicator-text`);
    
        let arc = describeArc(50, 50, 45, 0, angle);
    
        arcPath.attr('d', arc)
               .attr('stroke', arcColor);
    
        let needleAngle = (normalizedValue * 180) - 90; 
        needle.attr('transform', `rotate(${needleAngle} 50 50)`);
    
        textElement.text(`${value.toFixed(1)}`);
    }


    // Creating a dropdown for selecting the year
    let yearSelect = d3.select('#container1')
        .append('select')
        .attr('id', 'year-select')
        .on('change', function(event) {
            updateMap(this.value);
        });

    // Populate the dropdown with years from the dataset
    let years = Array.from(new Set(data.map(d => d.year_id))).sort();
    yearSelect.selectAll('option')
        .data(years)
        .enter()
        .append('option')
        .text(d => d)
        .attr('value', d => d);

    updateMap(years[0]);
    });
});
