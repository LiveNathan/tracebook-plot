import {JSArray} from './arrays';

let INVERT_POLARITY = false;
let COHERENCE_THRESHOLD = 0;
let DELAY_MS = 0;

Highcharts.setOptions({
    accessibility: {
        enabled: false // Override warning
    },
    plotOptions: {
        series: {
            animation: false // No!
        },
        line: {
            animation: false // No!
        }
    }
});

const magnitudeChart = Highcharts.chart("magnitudeCoherenceGraph", {
    chart: {
        type: "line",
        zoomType: "x",
        isZoomed: false,
        alignTicks: false,
        animation: false
    },
    title: {
        text: null,
    },
    xAxis: {
        type: "logarithmic",
        min: 15,
        max: 19000, // Show 16k label
        //allowDecimals: false,
        tickPositions: [
            15, 31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
        ].map((v) => Math.log10(v)),
        gridLineWidth: 0.5,
        //crosshair: false
    },
    yAxis: [{
        min: -30,
        max: 30,
        tickInterval: 10,
        //endOnTick: false,
        title: {
            text: "Magnitude",
            reserveSpace: false,
        },
        labels: {
            format: "{value}dB",
        },
        //crosshair: false
    },
        {
            // Secondary yAxis
            title: {
                text: "Coherence",
                reserveSpace: false,
            },
            labels: {
                align: "right",
                formatter: function () {
                    return this.value * 100 + "%";
                },
                //format: '{value}%',
                x: -4,
                y: -2,
            },
            opposite: true,
            min: 0,
            max: 1,
            tickInterval: 0.5,
            gridLineWidth: 0,
            height: '50%'
        },
    ],
    legend: {
        enabled: false,
    },
    series: [{
        name: "Magnitude",
        yAxis: 0,
        color: "blue",
        //connectNulls: true,
        //data: xymagnitude,
        zIndex: 101,
    },
        {
            name: "Coherence",
            yAxis: 1,
            color: "red",
            connectNulls: false,
            //data: xycoherence,
            zIndex: 100,
        },
        {
            name: "Magnitude",
            yAxis: 0,
            color: "orange",
            //connectNulls: true,
            //data: xymagnitude,
        },
        {
            name: "Coherence",
            yAxis: 1,
            color: "orange",
            connectNulls: false,
            //data: xycoherence,
        },
    ]
});

const phaseChart = Highcharts.chart("phaseGraph", {
    chart: {
        type: "line",
        zoomType: "x",
        isZoomed: false,
        alignTicks: false,
        animation: false
    },
    title: {
        text: null,
    },
    xAxis: {
        type: "logarithmic",
        min: 15,
        max: 19000, // Show 16k label20000
        tickPositions: [
            15, 31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
        ].map((v) => Math.log10(v)),
        gridLineWidth: 0.5,
        //crosshair: {enabled: true}
    },
    yAxis: [{
        min: -180,
        max: 180,
        tickInterval: 60,
        title: {
            text: "Phase",
            reserveSpace: false,
        },
        labels: {
            format: "{value}º",
        },
        //crosshair: {enabled: true}
    },],
    legend: {
        enabled: false,
    },
    series: [{
        name: "Phase",
        yAxis: 0,
        color: "blue",
        //connectNulls: true,
        //data: xyphase,
        zIndex: 100,
    },
        {
            name: "Delayed Phase",
            yAxis: 0,
            color: "blue",
            //connectNulls: true,
            //data: xyphase,
            visible: true, // Set this to true when needed
            zIndex: 101,
        },
        {
            name: "Phase",
            yAxis: 0,
            color: "orange",
            //connectNulls: true,
            //data: xyphase,
            visible: false, // Set this to true when needed
        },
    ]
});

// Convert JS array to TF XY pairs
// { frequency[], magnitude[], phase[], coherence[] }
// { [frequency, magnitude], [frequency, phase], [frequency, coherence] }
function js2tf(js) {
    let tf = {};
    tf.magnitude = js.frequency.map((freq, i) => [freq, js.magnitude[i]]);
    tf.phase = js.frequency.map((freq, i) => [freq, js.phase[i]]);
    tf.coherence = js.frequency.map((freq, i) => [freq, js.coherence[i]]);
    return tf;
}

let tf0 = js2tf(JSArray[0]);
let tf1 = js2tf(JSArray[1]);

processData();

// --------------------------------------------------------------------------------

// Demo UI

document.getElementById("polarityCheckbox").addEventListener("click", (event) => {
    INVERT_POLARITY = event.target.checked;
    processData();
});

document.getElementById("delayRange").addEventListener("input", (event) => {
    DELAY_MS = (event.target.value);
    processData();
    updateControls();
});

document.getElementById("delayInput").addEventListener("input", (event) => {
    DELAY_MS = (event.target.value);
    processData();
    updateControls();
});

document.getElementById("coherenceRange").addEventListener("input", (event) => {
    COHERENCE_THRESHOLD = event.target.value / 100;
    processData();
    updateControls();
});


document.getElementById("resetButton").addEventListener("click", () => {
    INVERT_POLARITY = false;
    COHERENCE_THRESHOLD = 0;
    DELAY_MS = 0;
    processData();
    updateControls();
});

document.getElementById("secondaryButton").addEventListener("click", () => {
    if (tf1.magnitude.length === 0) {
        tf0 = js2tf(JSArray[0]);
        tf1 = js2tf(JSArray[1]);
    } else {
        tf1.magnitude = [];
        tf1.phase = [];
        tf1.coherence = [];
    }
    processData();
    updateControls();
});


function updateControls() {
    document.getElementById("polarityCheckbox").checked = INVERT_POLARITY;
    document.getElementById("delayRange").value = DELAY_MS;
    document.getElementById("delayInput").value = DELAY_MS;
    document.getElementById("coherenceRange").value = COHERENCE_THRESHOLD * 100;
    document.getElementById("coherenceInput").value = Math.round(COHERENCE_THRESHOLD * 100);
}

// --------------------------------------------------------------------------------

// Processing

// Call this every time a setting changes
function processData() {

    // If tf1 has not been set, create empty object
    if (typeof tf1 === 'undefined' || tf1 === null) {
        tf1 = {
            magnitude: [],
            phase: [],
            coherence: []
        }
    }

    //console.log(`Delay: ${DELAY_MS} Invert:${INVERT_POLARITY} Coherencce:${COHERENCE_THRESHOLD}`)
    const noRedraw = false;
    const noAnimation = false;

    // Magnitude and coherence
    const newxymagnitude = tf0.magnitude.map((v, i) => mapThreshold(v, i, tf0));
    const newxycoherence = tf0.coherence.map((v, i) => mapThreshold(v, i, tf0));

    magnitudeChart.series[0].setData(newxymagnitude, noRedraw);
    magnitudeChart.series[1].setData(newxycoherence, noRedraw);

    // Original phase
    const newxyphase = tf0.phase.map((v, i) => mapThreshold(v, i, tf0));
    phaseChart.series[0].setData(newxyphase, noRedraw);


    // Delayed/inverted phase
    if (DELAY_MS === 0 && !INVERT_POLARITY) {
        // Restore original phase color
        phaseChart.series[0].color = "blue";

        //phaseChart.series[1].setVisible(false, noRedraw);
        phaseChart.series[1].setData(null, noRedraw);

    } else {
        // Orignal phase changes color to background (silver or dashed)
        phaseChart.series[0].color = "silver";

        // Processed phase becomes blue
        const newxydelayphase = tf0.phase.map((v, i) => mapThreshold(v, i, tf0)).map(mapDelay).map(mapPolarity);
        phaseChart.series[1].setVisible(true, noRedraw);
        phaseChart.series[1].setData(newxydelayphase, noRedraw);
    }

    magnitudeChart.series[2].setData(tf1.magnitude.map((v, i) => mapThreshold(v, i, tf1)), noRedraw);
    magnitudeChart.series[3].setData(tf1.coherence.map((v, i) => mapThreshold(v, i, tf1)), noRedraw);

    phaseChart.series[2].setData(tf1.phase.map((v, i) => mapThreshold(v, i, tf1)), noRedraw);
    phaseChart.series[2].setVisible(true, noRedraw);

    magnitudeChart.redraw(noAnimation);
    phaseChart.redraw(noAnimation)

}

function mapPolarity(v) {
    if (!INVERT_POLARITY || v[1] === null) { // Ignore null values
        return v;
    }

    return [v[0], wrapTo180(v[1] + 180) ];
}

// Apply delay and polarity to XY phase
function mapDelay(v) {
    if (v[1] === null) { // Ignore null values
        return v;
    }

    const f = v[0];
    let p = v[1];

    // Delay
    if (DELAY_MS !== 0) {
        p = p + (f * 360 * (DELAY_MS * -1 / 1000));
        p = wrapTo180(p);
        p = round(p, 2); // Tidy up decinal places
    }

    return [f, p];
}

// Set XY items to null if below choherence treshhold.
function mapThreshold(v, i, tf = tf0) {
    return (tf.coherence[i][1] < COHERENCE_THRESHOLD) ? [v[0], null] : v;
}

// --------------------------------------------------------------------------------

// Math stuff

// Simplified phase wrap
// https://stackoverflow.com/questions/11498169/dealing-with-angle-wrap-in-c-code/11498248#11498248
// Phase in degress is exact. No need to correct for floating point error as with radians.
function wrapTo180(x) {
    let y = (x + 180) % 360;
    if (y < 0)
        y += 360;
    return y - 180;
}

// Round number to set number of decimal places
function round(x, d) {
    const m = Math.pow(10, d || 0);
    return Math.round(x * m) / m;
}
