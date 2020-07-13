var wsaudio = {

  Port : class {
    /*
     * abstraction for holding an audio stream
     *
     * stream - audio stream to wrap
     */
    constructor(stream) {
      this.audio = stream;
      this.context = new AudioContext();
    }

    /*
     * opens the port for reading.
     *
     * params - not used atm
     * returns a stream object
     */
    async open(params) {
          params = params || {};
      var BUFSIZE = params.bufsize || undefined;
      var source  = this.context.createMediaStreamSource(this.audio);
      var lastNode = source;
      var ctx = this.context;

      this.readable = {
        pipeToN: function(rate, fun) {
          // example: for extracting data at lower speed
          // audio samples at 8kHz
          // sensor samples at 100Hz -> need every 80sample
          // XXX we assume that rate stay constant
          var leftover = 0;
          var node = ctx.createScriptProcessor(BUFSIZE, 1, 1);
          node.onaudioprocess = function(ev) {
            var buf = ev.inputBuffer.getChannelData(0);
            var step = ev.inputBuffer.sampleRate / 100;
            var frame = new Float32Array( (buf.length+leftover)  / step );

            //
            // find the start of the frames, and copy in what is non-zero
            //
            for (var i = buf.findIndex(x => x!=0), j = 0;
                     i < buf.length;
                     i += step, j += 1) {

              frame[j] = buf[i];

            };

            fun(frame);
            leftover = buf.length % step;
          }

          lastNode.connect(node);
          //
          // this is required for chrome to work
          //
          node.connect(ctx.destination);
          lastNode = undefined;

          return this;
        },

        //
        // XXX disabled since untested
        //
        // pipeThrough: function(fun) {
        //   var node = ctx.createScriptProcessor(BUFSIZE, 1, 1);
        //   node.onaudioprocess = function(ev) {
        //     if (ev.inputBuffer.length == 0)
        //       return;

        //     var arr = fun(ev.inputBuffer.getChannelData(0));
        //     var out = ev.outputBuffer.getChannelData(1);

        //     for(var i=0; i < arr.length && i < out.length; i++)
        //       out[i] = arr[i];
        //   };
        //   lastNode.connect(node);
        //   lastNode = node;

        //   return this;
        // }
      }

      return this.readable;
    }
  },


  enumerate: async function() {
   /*
    * enumerate all available devices matching the constraint
    */
    return navigator.mediaDevices.enumerateDevices();
  },

  requestPort: async function(devId) {
    /*
     * prompts the user to enable and choose a device, if not already
     * stored from previous sessions.
     *
     *  devid - select only devid matching deviceID
     *          https://www.html5rocks.com/en/tutorials/getusermedia/intro/
     */
    constraint = {};
    constraint.audio = {
      deviceId: devId,
      sampleRate: 44100,
      autoGainControl: false,
      echoCancellation: false,
      noiseSuppression: false,
      sampleSize: 16,
      channelCount: 1 };

    return navigator.mediaDevices.getUserMedia(constraint)
      .then(stream => new wsaudio.Port(stream) )
      .catch(e => console.log(e.name + ": "+ e.message));
  }
}
