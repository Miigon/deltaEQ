/*
    deltaEQ - headphone equalization profile generator
    2020-02-08 Author: Miigon
    
    Some codes can be implemented more elegantly and efficiently by using
    modern javascript. They are unused for more compatibility. 

*/

// todo: turn global variable into local (browser)
var is_node = false;
var show_log = true;
var show_verbose = false;

if(typeof document === "undefined") {
    // no document, assuming Node.js
    is_node = true;
    console = require("console");
    fs = require("fs");
}

function log(msg) {
    if(show_log === true) {
        console.log("[deltaEQ] " + msg);
    }
}

function verboselog(msg) {
    if(show_verbose === true) {
        console.log("[deltaEQ] " + msg);
    }
}

this.setShowLog = function(log,verbose) {
    show_log = log;
    show_verbose = verbose;
}

this.profileGenerators = {};

this.generateEQProfileForSoftware = function(eqArray, software) {
    var generator = this.profileGenerators[software];
    if(typeof generator != "function") {
        throw new Error("Invaild profile generator: " + software);
    }
    return generator(eqArray);
}

this.getDeltaEQArrayByModel = function(model_a,model_b) {
    var deltaGraph = this.getDeltaGraphByModel(model_a,model_b);
    var croppedGraph = this.cropFrequencyRange(deltaGraph,20,20000);
    return this.generateEQArray(croppedGraph);
}

this.getDeltaGraphByModel = function(model_a,model_b) {
    log("getDeltaGraphByModel: " + model_a + ", " + model_b);
    log("--- graph A ---");
    var ga_data = this.getFrequencyResponseData(model_a);
    var ga = this.generateFrequencyResponseGraphFromData(ga_data);
    // invert graph A to get a compensationGraph which, when applied, effectively makes the headphone "neutral".
    log("--- compensation graph from graph A ---");
    var ga_inverted = this.generateCompensationGraph(ga);
    log(ga["9948.487"]);

    log("--- graph B ---");
    var gb_data = this.getFrequencyResponseData(model_b);
    var gb = this.generateFrequencyResponseGraphFromData(gb_data);
    log(gb["9948.487"]);

    log("--- add two graphs together ---");
    return this.addGraph(ga_inverted,gb); // result = graph_b - graph_a
}

this.cropFrequencyRange = function(graph, start, end) {
    var resultGraph = {}
    for(var frequency in graph) {
        if(graph.hasOwnProperty(frequency)) {
            var frequency_number = Number(frequency);
            if(frequency_number && Number(frequency) >= start && frequency_number <= end) {
                resultGraph[frequency] = graph[frequency];
            }
        }
    }
    return resultGraph;
}

this.generateEQArray = function(graph) {
    log("generateFrequencyResponseArray: ");
    var frequencies_in_graph = Object.keys(graph).sort(function(a, b) {return a - b;});
    var resultArray = [];
    for(var i = 0; i < frequencies_in_graph.length; i++) {
        var frequency = frequencies_in_graph[i];
        resultArray[i] = [Number(frequency),graph[frequency]];
    }
    return resultArray;
}

this.generateCompensationGraph = function(graph) {
    log("generateCompensationGraph: ");
    var resultGraph = {};
    for(var frequency in graph) {
        if(graph.hasOwnProperty(frequency)) {
            resultGraph[frequency] = -graph[frequency];
        }
    }
    return resultGraph;
}

this.addGraph = function(graph_a,graph_b) {
    log("addGraph: ");

    var resultGraph = {};
    for(var frequency in graph_a) {
        if(graph_a.hasOwnProperty(frequency)) {
            var a_response = graph_a[frequency];
            var b_response = graph_b[frequency];
            /* 
            if(typeof b_response !== "number") {
                throw new GraphError("MISMATCH",frequency);
            }
            */
            if(typeof b_response !== "number") continue;
            resultGraph[frequency] = a_response + b_response;
        }
    }
    return resultGraph;
}


class DataError extends Error {
    constructor(error_type = "FORMAT", additional_message = "None.") {
        super();

        if(Error.captureStackTrace) {
            Error.captureStackTrace(this, DataError);
        }
  
        this.name = 'DeltaEQDataError';
        this.error_type = error_type;
        if(error_type === "HEADER"){
            this.message = "Invaild frequency response data header, likely due to rtings.com's changing their data format. Please update your deltaEQ to the latest version. If already, wait for a deltaEQ update. \nAdditional Message:" + additional_message;
        } else {
            this.message = "Invaild frequency response data format. \nAdditional Message:" + additional_message;
        }
    }
}
class GraphError extends Error {
    constructor(error_type = "MISMATCH", graph_index = "unknown index", additional_message = "None.") {
        super();

        if(Error.captureStackTrace) {
            Error.captureStackTrace(this, GraphError);
        }
  
        this.name = 'DeltaEQGraphError';
        this.error_type = error_type;
        this.graph_index = graph_index;
        if(error_type === "MISMATCH"){
            this.message = "Graph B is not a subset of Graph A.\nGraph A contains frequency ["+graph_index+"] which isn't present in Graph B.\nCurrent version of deltaEQ doesn't support that.\nAdditional Message:" + additional_message;
        } else {
            this.message = "Error when processing graph data at ["+graph_index+"].\nAdditional Message:" + additional_message;
        }
    }
}
this.DataError = DataError;
this.GraphError = GraphError;

this.getFrequencyResponseData = function(model) {
    log("getFrequencyResponseData: " + model);
    return readFile(model + ".frg.json");
}

this.generateFrequencyResponseGraphFromData = function(rawData) {
    log("generateDeltaGraphFromData: Data length:" + rawData.length);
    log("parsing JSON");
    var data = JSON.parse(rawData);
    if(typeof data !== "object" || data["header"] === undefined || data["data"] === undefined) {
        throw new DataError("FORMAT","JSON parsed but header or data(or both) is missing.");
    }

    log("Checking if header is vaild")
    var header = data["header"];
    var expect_header = ["Frequency","Left","Right","Target Response","Left","Right"];
    for(var i = 0; i < header.length; i++) {
        if(expect_header[i] !== header[i]) throw new DataError("HEADER");
    }
    
    log("Generating response graph");
    var frg = {};
    var rawfrgdata = data["data"];
    for(var i = 0; i < rawfrgdata.length; i++) {
        var raw_datapoint = rawfrgdata[i];
        if(raw_datapoint.length !== 6) {
            throw new DataError("FORMAT","Datapoint "+i+" has "+datapoint.length+" members, 6 expected.");
        }
        var frequency = Number(raw_datapoint[0]);
        if(typeof frequency !== "number") {
            throw new DataError("FORMAT","Datapoint "+i+" has invaild frequency ["+raw_datapoint[0]+"].");
        }
        var target_response = raw_datapoint[3] || 90;
        var left_response = raw_datapoint[1] || raw_datapoint[4] || target_response;
        var right_response = raw_datapoint[2] || raw_datapoint[5] || target_response;
        // Stores the distance to target response(dB SPL), instead of actual response amplitude.
        // Uses the average value of two stereo channels.
        frg[frequency] = (left_response + right_response) / 2 - target_response;
    }
    return frg;
}

// deltaEQ requests files synchronously.
if(is_node) {
    function readFile(file){
        log("readFile[fs]: " + file);
        return String(fs.readFileSync(file));
    }
} else {
    function readFile(file){
        log("readFile[http]: " + file);
        var request = new XMLHttpRequest();
        request.open('GET', file, false);
        request.send(null);
        if(request.readyState === 4 && request.status === 200) {
            var type = request.getResponseHeader('Content-Type');
            if(type.indexOf("text") !== 1) {
                return String(request.responseText);
            }
        }
    }
}

// ==== Profile Generators ==== //

function selectFrequencies(eqArray, freqs) {
    log("selectFrequency: ")
    // generate a EQArray with a selected set of frequencies.
    var index = 0;
    var resultArray = [];
    var lastFrequency = eqArray[0][0];
    for(var i = 0; i < eqArray.length; i++) {
        var thisFrequency = eqArray[i][0];
        var targetFrequency = freqs[index];
        if(thisFrequency >= targetFrequency) {
            var value;
            var frequencyUsed;
            if(thisFrequency - targetFrequency <= targetFrequency - lastFrequency) {
                // this one's closer
                value = eqArray[i][1];
                frequencyUsed = thisFrequency;
            } else {
                // last one's closer
                value = eqArray[i-1][1];
                frequencyUsed = lastFrequency;
            }
            log("using " + frequencyUsed + "Hz[" + value + " db SPL] for " + targetFrequency);
            resultArray[index] = [targetFrequency,value];
            index++;
            if(index >= freqs.length) break;
            // In one case, where the data is distributed as following:
            // [ eqArray ] 20Hz           50Hz 60Hz
            // [ freqs   ]      30Hz 40Hz          
            // (when more than one freqs value is sitting between two eqArray values)
            // For 30Hz, this routine will correctly select data from 20Hz
            // For 40Hz, data from 60Hz instead of the closer 50Hz will be selected, which is incorrect.
            // This is really rare though, because it requires the frequencies in freqs to be really dense for it to happen.
            // And shouldn't affect the result in most cases, where freqs is way less dense than eqArray.
        }
        lastFrequency = thisFrequency;
        verboselog("this: " + thisFrequency + "Hz[" + value + " db SPL], index:" + index);
    }
    // Fill the rest with data from the last frequency.
    for(; index < freqs.length; index++) {
        resultArray[index] = [freqs[index],eqArray[eqArray.length-1][1]];
        log("using " + lastFrequency + "Hz[" + value + " db SPL] for " + targetFrequency + " (fill)");
    }
    return resultArray;
}
this.selectFrequencies = selectFrequencies;

this.profileGenerators["eqmac2-31band"] = function(eqArray) {
    var freqs = [20,25,31.5,40,50,63,80,100,125,160,200,250,315,400,500,630,800,1000,1250,1600,2000,2500,3150,4000,5000,6300,8000,10000,12500,16000,20000];
    return selectFrequencies(eqArray,freqs);
}

this.profileGenerators["eqe-lua"] = function(eqArray) {
    var result = "";
    result += "return {\n";
    result += "    {\n";
    result += "        name = \"preamp\",\n";
    result += "        gain = 0,\n";
    result += "    },\n";
    for(var i = 0; i < eqArray.length; i++) {
        if(i % 5 != 0) continue; // Only use every 5th datapoint (too much can cause issue)
        var frequency = eqArray[i][0];
        var value = eqArray[i][1];
        result += "    {\n";
        result += "        name = \"eq\",\n";
        result += "        frequency = \"" + frequency + "\",\n";
        result += "        Q = \"25\",\n"; // highest possible
        result += "        gain = \"" + value + "\",\n";
        result += "    },\n";
    }
    result += "}\n";
    return result;
}