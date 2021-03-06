(function() {
  var height = 400,
      width = 700,
      centered;

  var svg = d3.select("#map_2b")
        .append("svg")
        .attr("height", height)
        .attr("width", width)
        .append("g")
        .attr("transform", "translate(0,0)");

  var tip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {
          return "<strong style='color: Red;font-size:15pt'>" + d.HeroName + "</strong>" +
              "<br>" +
              // '<img src="http://i.annihil.us/u/prod/marvel/i/mg/2/00/53710b14a320b.png" alt="Mountain View" style="width:150px;height:150px;">'+
              '<img src="http://www.superherodb.com/pictures/portraits/' + d.HeroName.toLowerCase() + '.jpg" alt="'+ d.HeroName + '" style="width:120px;height:140px;">'+
              "<br><span style='color:#40bf80;font-size:10pt' 'font-weight:bolder'> Full Name:  </span>" +
              "<span style='color:black;font-size:10pt' 'font-weight:bolder'> " + d.FullName +
              "<br><span style='color:#40bf80;font-size:10pt' 'font-weight:bolder'> Origin:  </span>" +
              "<span style='color:black;font-size:10pt' 'font-weight:bolder'> " + d.Placeofbirth +
              "<br><span style='color:#40bf80;font-size:10pt' 'font-weight:bolder'> Type:  </span>" +
              "<span style='color:black;font-size:10pt' 'font-weight:bolder'> " + d.Category + "</span>"
      })

  svg.call(tip);

  var dispatch = d3.dispatch("load", "statechange");

  function type(d) {
    d.total = d3.sum(groups, function(k) { return d[k] = +d[k]; });
    return d;
  }

  d3.queue()
    .defer(d3.json, "us.json")
    .defer(d3.csv, "assets/data/dc-superheroes_geocodio.csv")
    // #33CCFF
    .await(ready)

  var projection = d3.geoAlbersUsa()
    .translate([width/2,height/2])
    .scale(850)

  var path = d3.geoPath()
    .projection(projection)

  var radiusScale = d3.scaleSqrt().domain([0,100]).range([0.2, 10])

  function clicked(d) {
    console.log(path.centroid(d))
    var x, y, k;

    if (d && centered !== d) {
      var centroid = path.centroid(d);
      x = centroid[0];
      y = centroid[1];
      k = 4;
      centered = d;
    } else {
      x = width / 2;
      y = height / 2;
      k = 1;
      centered = null;
    }
    svg.selectAll("path")
      .classed("active", centered && function(d) { return d === centered; });

    svg.transition()
        .duration(750)
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
        .style("stroke-width", 1.5 / k + "px");
  }

  function ready(error, data, dc) { // how to reset.

    if (!dc) throw error;
    var raceByLocation = d3.map();
    dc.forEach(function(d) {
      raceByLocation.set(d.Category, d);
    })

    // Dropdown menu for dc
    dispatch.on("load.menu", function(raceByLocation) {
      console.log('building select menu DC');
      var select = d3.select("#select-menu2b")
        .append("div")
        .append("select")
        .on("change", function() {
          var category = this.value;

          console.log('FILTERING FOR', category)

          svg.selectAll(".city-circle2")
            .classed('filtered-in', function(d) {
              if (d.Category===category || category === "All") {
                return true
              } else {
                return false
              }
            })
            .attr("opacity",function(d){
              if (d.Category===category || category === "All") {
                return .5
              } else {
                return 0
              }
            })
            .attr("r",function(d){
              if (d.Category===category || category === "All") {
                return radiusScale(d.Power)
              } else {
                return 0
              }
            })
      });

      var allRaces = ['All', 'Alien', 'God', 'Human', 'Inhuman', 'Mutant', 'Robot', 'Unknown']

      select.selectAll("option")
          .data(allRaces)
          .enter().append("option")
          .attr("value", function(d) {
            console.log(d)
            return d;
          })
          .text(function(d) { return d; });
    });
    dispatch.call("load", this, raceByLocation);

    // Taking care of the State/County-level map borderlines.
    var county = topojson.feature(data, data.objects.counties).features;

    svg.selectAll(".county")
      .data(county)
      .enter().append("path")
      .attr("d",path)
      .attr("class","county")
      .attr("fill","#333333")
      .attr("stroke",'#696969')
      .attr("stroke-width",0.2)

    var states = topojson.feature(data, data.objects.states).features;

    svg.selectAll(".states")
      .data(states)
      .enter().append("path")
      .attr("d",path) // a path always needs 'd' as an attribute
      .attr("class","states")
      .attr("fill","transparent")
      .attr("stroke",'#696969')
      .attr("stroke-width",1)
      .on('mouseover',function() {
        d3.select(this)
          .attr("fill","gray")
          .attr("opacity",0.45)
      })
      .on('mouseout',function() {
        d3.select(this)
          .attr("fill","transparent")
      })
      .on("click", clicked);

    // console.log(dc)
    var sorted_dc = dc.sort(function(a, b) {
      return b.Power - a.Power;
    });

    svg.selectAll(".city-circle2")
      .data(sorted_dc)
      .enter().append("circle")
      .attr("class","city-circle2")
      .attr("r",function(d) {
        return radiusScale(d.Power)
      })
      .attr("fill","#57FEFF")
      .attr("stroke","#2F4F4F")
      .attr("stroke-width", 0.8)
      .attr("opacity",0.5)
      .attr("cx",function(d) {
        var coords = projection([d.Longitude,d.Latitude])
        // console.log(coords)
        if (coords!==null) {
          return coords[0];}
        else {return -1}
      })
      .attr("cy",function(d) {
        var coords = projection([d.Longitude,d.Latitude])
        if (coords!==null) {
          return coords[1];}
        else {return -1}
      })
      .on('mouseover', function(d, i) {
        var element = d3.select(this);
          // console.log(element.classed("filtered-in"))
          // if (element.classed("filtered-in")) {
            tip.show(d)
            element.style("stroke-width", "3")
            element.style("stroke", "maroon")
            element.style("fill","red")
            element.style("opacity", 1)
          // }
      })
      .on('mouseout', function(d, i) {
        var element = d3.select(this);
          // if (element.classed("filtered-in")) {
            tip.hide(d)
            element.style("fill","#57FEFF")
            element.style("opacity", 0.5)
            element.style("stroke-width", 0.8)
            element.style("stroke", "#2F4F4F")
          // }
      })

  }


})();
