import React, { useEffect, useState, useRef } from 'react'
import * as d3 from 'd3'
import censusData from '../censusData.json'
import usaMap from '../usaMap.json'
import { mesh, feature } from 'topojson-client'
import Legend from '../Legend'
import axios from 'axios'


const Map = () => {
    //component states
    const [race, setRace] = useState('')
    const [clicked, setClicked] = useState('All')
    const [county, setCounty] = useState('')
    const d3Map = useRef()

    //sets race filter to all once component initially renders
    useEffect(() => {
        setRace('0')
    },[])

    //create US state obj that gets filtered by race
    const filteredDataObj = {}
    censusData.slice(1).filter(data=> data[2]===race).map(data => {
        filteredDataObj[data[0]]=[parseInt(data[1]),data[3]]
        return data
    })

    //Only shows state that is clicked and counties population
    async function getData () {
        let filteredCountyObj = {}
        if(county!==''){
            const {data} = await axios.get('https://api.census.gov/data/2019/pep/population?get=NAME,POP&for=county:*&in=state:'+county)
            data.slice(1).map(data => {
                let id = data[2].toString()+data[3].toString()
                filteredCountyObj[id]=parseInt(data[1])
                return data
            })
            
            const color2 = d3.scaleQuantile([1,70], d3.schemeBlues[9])

            svg.append("path")
            .datum(mesh(usaMap, usaMap.objects.nation))
            .attr('id','countyNation')
            .attr("fill", "black")
            .attr("stroke", "black")
            .attr("stroke-linejoin", "round")
            .style("stroke-width", "2")
            .attr("d", path);

            svg.append("g")
            .selectAll('path')
            .data(feature(usaMap, usaMap.objects.counties).features)
            .join('path')
            .attr('id', d => d.properties.name)
            .attr('class', 'counties')
            .attr('fill', d => {
                if (filteredCountyObj[d.id]){
                    return color2(filteredCountyObj[d.id]/10000)
                }
            })
            .attr('d', path)
            .append('title').text(d => `${d.properties.name}:
            Population of ${format(filteredCountyObj[d.id])} people`);

            svg.append("path")
            .datum(mesh(usaMap, usaMap.objects.counties, (a, b) => a !== b))
            .attr('class','counties')
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-linejoin", "round")
            .style("stroke-width", ".5")
            .attr("d", path);

            svg.append("g")
            .attr("transform", "translate(580,20)")
            .attr('id','countyLegend')
            .append(() => Legend(color2, {title: `2019 ${clicked} Population (x10^4)`, width: 300,tickFormat: ".1f"}))

            svg.selectAll('.counties').on("click", d => {
                setClicked('All')
                setCounty('')
                svg.selectAll('.counties').remove()
                svg.selectAll('#countyNation').remove()
                svg.selectAll('#countyLegend').remove()
            })
        }
        filteredCountyObj = {}
    }

    //calls function that does api get request
    if(clicked!=='All'){
        getData()
    }

    //conditions for race population ranges
    let start;
    let end;
    let divider;
    let exp;
    if (race==='0'){
        start=1200000
        end=16200000
        divider=1000000
        exp=6
    } else if (race==='1'){
        start = 100000
        end = 13600000
        divider=1000000
        exp=6
    } else if (race==='2'){
        start = 15000
        end = 2000000
        divider=1000000
        exp=6
    } else if (race==='3'){
        start = 10000
        end = 320000
        divider=10000
        exp=4
    } else if (race==='4'){
        start = 20000
        end = 1000000
        divider=100000
        exp=5
    } else if (race==='5'){
        start = 1000
        end = 90000
        divider=1000
        exp=3
    } else if (race==='6'){
        start = 15000
        end = 600000
        divider=100000
        exp=5
    }

    //needed to construct map
    const path = d3.geoPath()
    const color = d3.scaleQuantile([start/divider,end/divider], d3.schemeYlOrRd[9])
    const format = d3.format(',')

    //Creating svg canvas
    const svg = d3.select(d3Map.current)
    .attr('width',975)
    .attr('height',610)
    .style('background-color','#282c34')

    //adding color to nation border
    svg.append("path")
    .datum(mesh(usaMap, usaMap.objects.nation))
    .attr("fill", "white")
    .attr("stroke", "black")
    .attr("stroke-linejoin", "round")
    .style("stroke-width", "2")
    .attr("d", path);

    //adding color to state borders
    svg.append("path")
    .datum(mesh(usaMap, usaMap.objects.states, (a, b) => a !== b))
    .attr("fill", "none")
    .attr("stroke", "black")
    .attr("stroke-linejoin", "round")
    .style("stroke-width", "2.5")
    .attr("d", path);

    //adding state fill color depending on pop
    svg.append("g")
    .selectAll('path')
    .data(feature(usaMap, usaMap.objects.states).features)
    .join('path')
        .attr('id', d => d.properties.name)
        .attr('class', 'states')
        .attr('name', d => filteredDataObj[d.properties.name][1])
        .attr('fill', d => {
            if(d.properties.name===clicked || clicked==='All'){
            return color(filteredDataObj[d.properties.name][0]/divider)
            }
        })
        .attr('d', path)
        .append('title').text(d => `${d.properties.name}:
        Population of ${format(filteredDataObj[d.properties.name][0])} people`)

    svg.selectAll('.states').on("click", d => {
        setClicked(d.srcElement.id)
        setCounty(d.srcElement.__data__.id)
        svg.selectAll('#stateLegend').transition().duration(600).remove()
        svg.selectAll('path').transition().duration(900).remove()
    })

    //adding legend
    svg.append("g")
    .attr("transform", "translate(580,20)")
    .attr('id','stateLegend')
    .append(() => Legend(color, {title: `2019 Population (x10^${exp})`, width: 300,tickFormat: ".1f"}))
    
    return (
        <div id='d3map'>
            <h3 id='title'>2019 US Population</h3>
            <h6>{'('}Hover over to see name and exact population{')'}</h6>
            {county==='' ? <form className='race-selector'>
                <label>Filter by Race: </label>
                <select onChange={(event)=> {
                    setRace(event.target.value)
                    svg.selectAll('path').transition().duration(900).remove()
                    svg.selectAll('#stateLegend').remove()
                    }}>
                    <option value='0'>None</option>
                    <option value='1'>White</option>
                    <option value='2'>Black</option>
                    <option value='3'>American Indian/Alaska Native</option>
                    <option value='4'>Asian</option>
                    <option value='5'>Native Hawaiian/Other Pacific Islander</option>
                    <option value='6'>Two or more races</option>
                </select>
            </form> : <p className='noSelector'>Filter by Race:</p>}
            <svg ref={d3Map}></svg>
        </div>
    )
}

export default Map;