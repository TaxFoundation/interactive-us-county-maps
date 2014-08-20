var width = 960,
    height = 500;

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

// Define increments for data scale
var dataScale = [],
    min = 80, //Floor for the first step
    max = 125, //Anything above the max is the final step
    steps = 10;
    increment = (max-min)/(steps-1);
// Create the scale of data values from min to max by # of steps
for (var step = 0; step < steps; step++) {
    dataScale.push(min + increment * step);
}

// Create distinct colors for each increment based on two base colors
var colors = [],
    borderColor = "#fff",
    noDataColor = "#ccc", //Color applied when no data matches an element
    lowBaseColor = "#f15a24", //Color applied at the end of the scale with the lowest values
    highBaseColor = "#29abe2"; //Color applied at the end of the scale with the highest values
var scaleColor = d3.scale.linear()
  .domain([0,steps-1])
  .range([lowBaseColor,highBaseColor])
  .interpolate(d3.interpolateRgb);
for (var c = 0; c < steps; c++) {
    //create legend
    svg.append("rect")
        .attr("height", 20)
        .attr("width", 20)
        .attr("x", width - 120)
        .attr("y", 200 + c*30)
        .attr("fill", scaleColor(steps - 1 - c));
    svg.append("text")
        .attr("x", width - 90)
        .attr("y", 218 + c*30)
        .text((max - increment*c) + ((c === 0) ? "+" : "-" + (max - increment*(c-1))));
    //add these distinct colors to array
    colors.push(scaleColor(c));
}

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("opacity", 0),
    dataFormat = d3.format("$,.5r");

var projection = d3.geo.albersUsa()
    .translate([width / 2, height / 2]);

var path = d3.geo.path()
    .projection(projection);

var mapColor = d3.scale.quantize()
    .domain([min, max])
    .range(colors);

queue()
    .defer(d3.json, "data/us.json")
    .defer(d3.csv, "data/rpp-dollars-data.csv")
    .await(ready);

function ready(error, us, data) {
    if (error) return console.error(error);

    svg.append("g")
        .attr("class", "counties")
    .selectAll("path")
        .data(topojson.feature(us, us.objects.counties).features)
    .enter().append("path")
        .attr("d", path)
        .attr("fill", noDataColor)
        .attr("id", function(d){return "county" + d.id;});

    data.forEach(function(d){
        d3.select("#county" + d.id)
            .style("fill", mapColor(parseFloat(d.rpp)))
            .on("mouseover", function(){ return addTooltip(d.metroName, d.rpp); })
            .on("mouseout", function(d){ tooltip.transition().duration(200).style("opacity",0); });
    });

    svg.append("path")
        .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
        .attr("fill", "none")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .attr("d", path);
}

var adjustment = d3.scale.linear()
                .domain([0, width])
                .range([0, 450]);

function addTooltip(label, number){
  tooltip.transition()
    .duration(200)
    .style("opacity", 0.9);
  tooltip.html(
    label + ": " + dataFormat(parseFloat(number))
  )
    .style("left", (d3.event.pageX - adjustment(d3.event.pageX)) + "px")
    .style("top", (d3.event.pageY + 50) + "px");
}