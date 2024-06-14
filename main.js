var margin = {top: 10, right: 30, bottom: 30, left: 60},
    width = 1600 - margin.left - margin.right, 
    height = 600 - margin.top - margin.bottom; 

var svg = d3.select("#my_dataviz")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

var cities = [
    { name: 'CLT', fullName: 'Charlotte, North Carolina', file: 'CLT.csv' },
    { name: 'CQT', fullName: 'Los Angeles, California', file: 'CQT.csv' },
    { name: 'IND', fullName: 'Indianapolis, Indiana', file: 'IND.csv' },
    { name: 'JAX', fullName: 'Jacksonville, Florida', file: 'JAX.csv' },
    { name: 'PHL', fullName: 'Philadelphia, Pennsylvania', file: 'PHL.csv' },
    { name: 'MDW', fullName: 'Chicago, Illinois', file: 'MDW.csv' },
    { name: 'PHX', fullName: 'Phoenix, Arizona', file: 'PHX.csv' }
];

function loadData(callback) {
    var data = [];
    var filesLoaded = 0;
    cities.forEach(function (city) {
        d3.csv(city.file, function (d) {
            return {
                city: city.name,
                date: new Date(d.date),
                actual_precipitation: +d.actual_precipitation,
                average_precipitation: +d.average_precipitation,
                record_precipitation: +d.record_precipitation
            };
        }).then(function (cityData) {
            data = data.concat(cityData);
            filesLoaded++;

            if (filesLoaded === cities.length) {
                callback(data);
            }
        });
    });
}

function updateChart(data, selectedVariable) {
    var nestedData = d3.nest()
        .key(function (d) { return d.city; })
        .entries(data);

    var keys = nestedData.map(function (d) { return d.key; });

    var color = d3.scaleOrdinal()
        .domain(keys)
        .range(d3.schemeSet2);

    svg.selectAll("*").remove();

var x = d3.scaleTime()
    .domain([new Date(2014, 5, 1), new Date(2015, 6, 30)]) 
    .range([0, width]);
var xAxis = svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%B %Y")));
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-90)"); 
    var y = d3.scaleLinear()
        .domain([0, d3.max(data, function (d) { return +d[selectedVariable]; })])
        .range([height, 0]);
    var yAxis = svg.append("g")
        .call(d3.axisLeft(y).ticks(5));

    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", 0)
        .attr("y", -20)
        .text(selectedVariable.replace(/_/g, ' '))
        .attr("text-anchor", "start");

    var line = d3.line()
        .x(function (d) { return x(d.date); })
        .y(function (d) { return y(d[selectedVariable]); });

    var areaChart = svg.append('g')
        .attr("clip-path", "url(#clip)");

    nestedData.forEach(function (d) {
        areaChart.append("path")
            .datum(d.values)
            .attr("fill", "none")
            .attr("stroke", function () { return color(d.key); })
            .attr("stroke-width", 1.5)
            .attr("d", line);
    });



var legend = svg.selectAll(".legend")
    .data(cities)
    .enter().append("g")
    .attr("class", "legend")
    .attr("transform", function(d, i) { return "translate(0," + (i * 20 + 30) + ")"; });
legend.append("rect")
    .attr("x", width - 100) 
    .attr("width", 18)
    .attr("height", 18)
    .style("fill", function(d) { return color(d.name); });

legend.append("text")
    .attr("x", width - 120)
    .attr("y", 9)
    .attr("dy", ".35em")
    .style("text-anchor", "end")
    .text(function(d) { return d.name + ' (' + d.fullName + ')'; });  
    var brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("end", updateChart);

    areaChart.append("g")
        .attr("class", "brush")
        .call(brush);

    function updateChart() {
        var extent = d3.event.selection;

        if (!extent) {
            if (!idleTimeout) return idleTimeout = setTimeout(idled, 350);
            x.domain(d3.extent(data, function (d) { return d.date; }));
        } else {
            x.domain([x.invert(extent[0]), x.invert(extent[1])]);
            areaChart.select(".brush").call(brush.move, null); 
        }

        xAxis.transition().duration(1000).call(d3.axisBottom(x).ticks(5));
        areaChart.selectAll("path")
            .transition().duration(1000)
            .attr("d", line);
    }

    var idleTimeout;
    function idled() { idleTimeout = null; }

    var highlight = function (d) {
        d3.selectAll(".myArea").style("opacity", .1);
        d3.select("." + d).style("opacity", 1);
    }

    var noHighlight = function (d) {
        d3.selectAll(".myArea").style("opacity", 1);
    }

    // Tooltip
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    areaChart.selectAll("path")
        .on("mouseover", function (event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(d.city + "<br/>" + d.date + "<br/>" + d[selectedVariable])
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    svg.selectAll("myrect")
        .on("mouseover", highlight)
        .on("mouseleave", noHighlight);

    svg.selectAll("mylabels")
        .on("mouseover", highlight)
        .on("mouseleave", noHighlight);
}

loadData(function (data) {
    updateChart(data, 'actual_precipitation');

    d3.select("#variableSelector").on("change", function () {
        var selectedVariable = d3.select(this).property("value");
        updateChart(data, selectedVariable);
    });
});
