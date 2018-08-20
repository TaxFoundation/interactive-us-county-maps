// Set params and queue map files
// Map variables
var width = 580,
  height = 450,
  svg = d3.select('body').append('svg')
    .attr('width', '100%')
    .attr('viewBox', '0 0 ' + width + ' ' + height),
  dataFormat = {
    percentage: d3.format('%'),
    percentageWithDecimals: d3.format(',.1%'),
    dollars: d3.format('$,'),
    dollarsAndCents: d3.format('$,.2f'),
    tens: d3.format('$,.4r'),
    hundreds: d3.format('$,.5r'),
    thousands: d3.format('$s'),
  },

// Data variables
  dataPath = 'data/rpp-2018-county.csv',
  legendDataType = dataFormat.dollars,
  tooltipDataType = dataFormat.dollarsAndCents,
  countyId = 'county',
  countyName = 'name',
  stateID = '',
  stateName = '',
  observation = 'value',
  rangeTruncated = true,
  divergent = true,

// Define increments for data scale
  min = 75, //Floor for the first step
  max = 125, //Anything above the max is the final step
  steps = 11, //Final step represents anything at or above max
  increment = (max - min) / (steps - 1),

// Color variables
  borderColor = '#fff', //Color of borders between states
  noDataColor = '#ddd', //Color applied when no data matches an element
  lowBaseColor = '#d73027', //Color applied at the end of the scale with the lowest values
  midBaseColor = '#ffffbf';
  highBaseColor = '#4575b4';

var sequentialDomain = [0, steps - 1];
var divergentDomain = [0, (steps - 1)/2, steps - 1];
var sequentialRange = [lowBaseColor, highBaseColor];
var divergentRange = [lowBaseColor, midBaseColor, highBaseColor];

// Create distinct colors for each increment based on two base colors
var colors = [],
  //Color applied at the end of the scale with the highest values
  scaleColor = d3.scale.linear()
    .domain(divergent ? divergentDomain : sequentialDomain)
    .range(divergent ? divergentRange : sequentialRange)
    .interpolate(d3.interpolateHsl); //Don't like the colors you get? Try interpolateHcl or interpolateHsl!

// Create basic legend and add generated colors to the 'colors' array
// Should replace this with D3.js Axis
for (var c = 0; c < steps; c++) {
  colors.push(scaleColor(c));
}

var tooltip = d3.select('body').append('div')
  .attr('class', 'tooltip')
  .style('position', 'absolute')
  .style('opacity', 0);

var projection = d3.geo.albersUsa()
  .scale(width * 1.2)
  .translate([width / 2, height - height * 0.6]);

var path = d3.geo.path()
  .projection(projection);

var mapColor = d3.scale.quantize()
  .domain([min, max + increment]) //Uses max+increment to make sure cutoffs between steps are correct
  .range(colors);

var map = svg.append('g')
  .attr('class', 'counties');

var legend = svg.append('g')
  .attr('class', 'legend')
  .attr('transform', 'translate(0,' + (height - height * 0.1) + ')');

queue()
  .defer(d3.json, 'data/us.json')
  .defer(d3.csv, dataPath)
  .await(ready);

// Map-building functions
function ready(error, us, data) {
  if (error) return console.error(error);

  map.selectAll('path')
    .data(topojson.feature(us, us.objects.counties).features)
  .enter().append('path')
    .attr('d', path)
    .attr('fill', noDataColor)
    .attr('id', function (d) { return 'county' + d.id; });

  data.forEach(function (d) {
    d3.select('#county' + parseInt(d[countyId]))
      .style('fill', mapColor(parseFloat(d[observation])))
      .on('mouseover', function () { return addTooltip(d[countyName], parseFloat(d[observation])); })
      .on('mouseout', function (d) { tooltip.transition().duration(200).style('opacity', 0); });
  });

  map.append('path')
    .datum(topojson.mesh(us, us.objects.states, function (a, b) { return a !== b; }))
    .attr('fill', 'none')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .attr('d', path);

  drawLegend();
}

var adjustment = d3.scale.linear()
        .domain([0, window.innerWidth])
        .range([0, 150]);

function addTooltip(label, number) {
  tooltip.transition()
  .duration(200)
  .style('opacity', 0.9);
  tooltip.html(
  label + ': ' + (typeof(+number) === 'number' ? tooltipDataType(number) : 'No Data')
  )
  .style('left', (d3.event.pageX - adjustment(d3.event.pageX)) + 'px')
  .style('top', (d3.event.pageY + 50) + 'px');
}

function drawLegend() {
  var legendData = [{'color': noDataColor, 'label': 'No Data'}],
    legendDomain = [],
    legendScale,
    legendAxis;

  if (rangeTruncated) {
    for (var i = 0, j = colors.length; i < j; i++) {
      var fill = colors[i];
      var label = legendDataType(min + increment * i)
        + (
          i === j - 1 ? '+' : '-'
          + legendDataType(min + increment * (i + 1))
        );
      legendData[i + 1] = { color: fill, label: label };
    }
  } else {
    for (var i = 0, j = colors.length; i < j; i++) {
      var fill = colors[i];
      var label = legendDataType(min + increment * i);
      legendData[i + 1] = { color: fill, label: label };
    }
  }

  for (var k = 0, x = legendData.length; k < x; k++) {
    legendDomain.push(legendData[k].label);
  }

  legendScale = d3.scale.ordinal()
    .rangeRoundBands([0, width], 0.2)
    .domain(legendDomain);

  legendAxis = d3.svg.axis()
    .scale(legendScale)
    .orient('bottom');

  legend.call(legendAxis);

  legend.selectAll('rect')
    .data(legendData)
  .enter()
    .append('rect')
    .attr('x', function (d) {return legendScale(d.label);})
    .attr('y', -30)
    .attr('height', 30)
    .attr('class', 'legend-item')
    .transition()
    .duration(700)
    .attrTween('width', function () {return d3.interpolate(0, legendScale.rangeBand());})
    .attrTween('fill', function (d) {return d3.interpolate('#fff', d.color);});
}
