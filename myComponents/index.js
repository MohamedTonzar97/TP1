
import './lib/webaudio-controls.js';

const getBaseURL = () => {
  const base = new URL('.', import.meta.url);
  console.log("Base = " + base);
  return `${base}`;
};

const template = document.createElement("template");
template.innerHTML = `
  <style>

    canvas {
      display: block;
      border: 1px solid black;
      margin-left: auto;
      margin-right: auto;
      margin-top:2%
      width:80%;
      height:60%

    }
    .buttonCustom{
      display: block;
      margin-left: auto;
      margin-right: auto;
      width: 40%;
    }
    
    .WebaudioCustom
    {
      display: block;
      margin-left:10%;
      margin-right: auto;
      width: 10%;
    }

    .WebaudioCustom
    {
      display: block;
      margin-left:60%;
      margin-right: auto;
      width: 10%;
    }
    .equalizer
    {
      margin-left:22%;
      color:grey;
    }
  </style>

  

    <audio id="myPlayer" preload="auto" crossorigin>
        <source src="./myComponents/assets/audio/canon.mp3" type="audio/mp3" />
    </audio>
    <div class="buttonCustom">
    <button id="playButton"  ><img src="./assets/imgs/play.png" style="Width:40px"></button>
    <button id="pauseButton" ><img src="./assets/imgs/pause.png" style="Width:40px"></button>
    <button id="mute"><img src="./assets/imgs/mute.png" style="Width:40px"></button>
    <button id="replay"><img src="./assets/imgs/replay.png" style="Width:40px"></button>
    </div>
    
    
    <div class="WebaudioCustom">
    <webaudio-knob id="knobVolume" tooltip="Volume:%s" src="./assets/imgs/LittlePhatty.png" sprites="100" value=0.5 min="0" max="1" step=0.01>
    Volume</webaudio-knob>
 
    <webaudio-knob id="knobStereo" tooltip="Balance:%s" src="./assets/imgs/balance.png" sprites="127" value=0 min="-1" max="1" step=0.01>
    Balance G/D</webaudio-knob>

    </div>

    <progress id="progressRuler" max=100 value=0 step=1 ></progress>

      <canvas id="myCanvas" ></canvas>

      <div class="equalizer">

    <label>60Hz</label>
    <webaudio-knob id="hz60" tooltip="Equalizer:%s" src="./assets/imgs/slider.png" sprites="59" value="0" step="1" min="-30" max="30" step="1" width=30 height=90></webaudio-knob>
    <output id="gain0">0 dB</output>


      <label>170Hz</label>
      <webaudio-knob id="hz170" tooltip="Equalizer:%s" src="./assets/imgs/slider.png" sprites="59" value="0" step="1" min="-30" max="30" step="1" width=30 height=90></webaudio-knob>
      <output id="gain1">30 dB</output>
  
      <label>350Hz</label>
      <webaudio-knob id="hz350" tooltip="Equalizer:%s" src="./assets/imgs/slider.png" sprites="59" value="0" step="1" min="-30" max="30" step="1" width=30 height=90></webaudio-knob>
      <output id="gain2">0 dB</output>
  
      <label>1000Hz</label>
      <webaudio-knob id="hz1000" tooltip="Equalizer:%s" src="./assets/imgs/slider.png" sprites="59" value="0" step="1" min="-30" max="30" step="1" width=30 height=90></webaudio-knob>
      <output id="gain3">0 dB</output>

      <label>3500Hz</label>
      <webaudio-knob id="hz3500" tooltip="Equalizer:%s" src="./assets/imgs/slider.png" sprites="59" value="0" step="1" min="-30" max="30" step="1" width=30 height=90></webaudio-knob>
      <output id="gain4">0 dB</output>
  
      <label>10000Hz</label>
      <webaudio-knob id="hz10000" tooltip="Equalizer:%s" src="./assets/imgs/slider.png" sprites="59" value="0" step="1" min="-30" max="30" step="1" width=30 height=90></webaudio-knob>
      <output id="gain5">0 dB</output>
      
      </div>
      
        `;

class MyAudioPlayer extends HTMLElement {
  constructor() {
    super();
    this.volume = 1;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.basePath = getBaseURL(); // url absolu du composant
    this.fixRelativeImagePaths();
  }

  connectedCallback() {
    this.player = this.shadowRoot.querySelector("#myPlayer");
    this.player.loop = true;

    // get the canvas, its graphic context...
    this.canvas = this.shadowRoot.querySelector("#myCanvas");
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.canvasContext = this.canvas.getContext('2d');

    //contexte webAudio
    let audioContext = new AudioContext();

    let playerNode = audioContext.createMediaElementSource(this.player);
    this.pannerNode = audioContext.createStereoPanner();
    this.filters = [];

    let mediaElement = this.shadowRoot.getElementById('myPlayer');
    mediaElement.onplay = (e) => { audioContext.resume(); }
    mediaElement.addEventListener('play', () => audioContext.resume());

    this.analyserNode = audioContext.createAnalyser()
    this.analyserNode.fftSize = 512;
    this.bufferLength = this.analyserNode.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);

    [60, 170, 350, 1000, 3500, 10000].forEach((freq, i) => {
      var eq = audioContext.createBiquadFilter();
      eq.frequency.value = freq;
      eq.type = "peaking";
      eq.gain.value = 0;
      this.filters.push(eq);
    });

    playerNode.connect(this.filters[0]);
    for (var i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1]);
    }

    this.filters[this.filters.length - 1].connect(this.pannerNode);
    this.pannerNode.connect(this.analyserNode);
    this.analyserNode.connect(audioContext.destination);

    this.visualize();
    this.declareListeners();
  }

  visualize() {
    // 1 effacer le canvas
    this.canvasContext.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.canvasContext.clearRect(0, 0, this.width, this.height);

    // 2 - Get the analyser data - for waveforms we need time domain data
    this.analyserNode.getByteTimeDomainData(this.dataArray);

    // 3 - draws the waveform
    this.canvasContext.lineWidth = 8;
    this.canvasContext.strokeStyle = 'gray';

    this.canvasContext.beginPath();
    var sliceWidth = this.width / this.bufferLength;
    var x = 0;

    for (var i = 0; i < this.bufferLength; i++) {
 
      var v = this.dataArray[i] / 255;
      var y = v * this.height;

      if (i === 0) {
        this.canvasContext.moveTo(x, y);
      } else {
        this.canvasContext.lineTo(x, y);
      }
      x += sliceWidth;
    }

    this.canvasContext.lineTo(this.width, this.height / 2);
    // draw the path at once
    this.canvasContext.stroke();


    // 3 rappel animation
    requestAnimationFrame(() => { this.visualize() });
  }

  changeGain(sliderVal, nbFilter) {
    var value = parseFloat(sliderVal);
    this.filters[nbFilter].gain.value = value;
    // update output labels
    var output = this.shadowRoot.querySelector("#gain" + nbFilter);
    output.value = value + " dB";
  }

  fixRelativeImagePaths() {
    let webaudioControls = this.shadowRoot.querySelectorAll(
      'webaudio-knob, webaudio-slider, webaudio-switch, img'
    );
    webaudioControls.forEach((e) => {
      let currentImagePath = e.getAttribute('src');
      if (currentImagePath !== undefined) {
        let imagePath = e.getAttribute('src');
        e.src = this.basePath + "/" + imagePath;
      }
    });
  }

  declareListeners() {
    this.shadowRoot.querySelector("#playButton").addEventListener("click", (event) => {
      this.play();
    });

    this.shadowRoot.querySelector("#pauseButton").addEventListener("click", (event) => {
      this.pause();
    });

    this.shadowRoot.querySelector("#replay").addEventListener("click", (event) => {
      this.replay();
    });

    this.shadowRoot.querySelector("#mute").addEventListener("click", (event) => {
      this.mute();
    });

    this.shadowRoot.querySelector("#knobVolume")
      .addEventListener("input", (event) => {
        this.setVolume(event.target.value);
      });

    this.shadowRoot.querySelector("#knobStereo").addEventListener("input", (event) => {
        this.setBalance(event.target.value);
      });

    this.player.addEventListener('timeupdate', (event) => {
      let p = this.shadowRoot.querySelector("#progressRuler");
      try {
        p.max = this.player.duration.toFixed(2);
        p.value = this.player.currentTime;
      } catch (err) {

      }
    })

   this.shadowRoot.querySelector("#hz60").addEventListener("change", (event) => {
    this.changeGain(event.target.value, 0);
  });

   this.shadowRoot.querySelector("#hz170").addEventListener("change", (event) => {
    this.changeGain(event.target.value, 1);
  });
   this.shadowRoot.querySelector("#hz350").addEventListener("change", (event) => {
    this.changeGain(event.target.value, 2);
  });
   this.shadowRoot.querySelector("#hz1000").addEventListener("change", (event) => {
    this.changeGain(event.target.value, 3);
  });

  this.shadowRoot.querySelector("#hz3500").addEventListener("change", (event) => {
    this.changeGain(event.target.value, 4);
  });
  
   this.shadowRoot.querySelector("#hz10000").addEventListener("change", (event) => {
    this.changeGain(event.target.value, 5);
  });

 
  }

  // API
  setVolume(val) {
    this.player.volume = val;
  }

  setBalance(val) {
    this.pannerNode.pan.value = val;
  }

  play() {
    this.player.play();
    this.player.playbackRate = 1;
    this.player.muted = false;
  }

  pause() {
    this.player.pause();
  }

  replay() {
    this.player.currentTime = 0;
  }

  mute(val) {
  if(this.player.muted == false ) {
      this.player.muted = true;
  } else {
      this.player.muted = false;
  }
}

}

customElements.define("my-audioplayer", MyAudioPlayer);
