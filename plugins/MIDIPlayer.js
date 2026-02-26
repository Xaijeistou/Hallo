/*:
 * @plugindesc MIDI Playback via system synth (JZZ.js) – supports FM/GM variants, volume control, looping, and fadeout.  
 * @author Xaijeistou
 * 
 * @help
 * Place .mid files in <project>/audio/midi/. Use the plugin commands:
 * 
 *   MidiPlay <name> <loopname>
 *   MidiStop 
 *   MidiSetPort <portNameOrIndex>
 *   MidiFadeout [fadeMiliseconds]
 *
 * Examples:
 *   Plugin Command: MidiPlay battleThemeIntro battleThemeLoop
 *   Plugin Command: MidiSetPort Tiny
 *	 Plugin Command: MidiSetPort 0
 *   Plugin Command: MidiStop 2000    # Fades out over 2 seconds
 *
 * Notes:
 * - Set port before playing MIDIs
 * - Preferably to stop one track before playing a new one
 * - Volume is set to whatever variable 15 is.
 * - The loopname can be the same as the first file if you want to loop it normally. Leave blank for no loop.
 * - Make sure MIDIs are at least FM ready. Otherwise some MIDIs might crash on loop, and some MIDIs just crash on play ¯\_(ツ)_/¯
 *
 * Dependencies:
 *   - JZZ.js
 *   - JZZ.midi.SMF.js
 *   - JZZ.synth.Tiny.js
 *   Place them in js/libs and load them in index.html before main.js.
 */

(function() {
    // Node modules and state
    const fs = require('fs');
    const path = require('path');
	let nextLoopFile = null;
	let fadeoutDuration = 0;
    let midiOut = null;          // Current MIDI output port
    let currentPlayer = null;    // Current SMF player instance
    let currentPortName = null;  // Name or index of the selected port

    // Open (or reopen) the MIDI output port. If portArg is undefined, open default (first) port.
    function openMidiOut(portArg) {

        if (midiOut && midiOut.close) midiOut.close();
        try {
            midiOut = JZZ().openMidiOut(portArg || currentPortName);
        } catch (e) {
            console.log("MidiPlayer: Cannot open MIDI out", e);
            // midiOut = JZZ().openMidiOut(['Microsoft GS Wavetable Synth 0', 'Apple DLS Synth', 0]);
        }
        if (midiOut) {
            console.log("MidiPlayer: MIDI Out opened:", midiOut.name());
        }
    }

    // Load and play a MIDI file by base name, the second MIDI to loop, and volume override
    function playMidi(baseName, baseName2, volume) {	
		
        if (currentPlayer) {
            currentPlayer.stop();
            currentPlayer = null;
        }
		
        // let filePath = path.join('audio', 'midi', baseName + '.mid');
		// ON EXPORT, USE THIS VERSION WITH www OTHERWISE IT WILL BREAK
		let filePath = path.join('www', 'audio', 'midi', baseName + '.mid');
		if (!fs.existsSync(filePath)) {
			console.error(`MidiPlayer: MIDI file not found: ${filePath}`);
			return;
		}

        let data;
        try {
            data = fs.readFileSync(filePath);
        } catch (e) {
            console.error("MidiPlayer: Error reading MIDI file", filePath, e);
            return;
        }
		
        let smf;
        try {
            smf = new JZZ.MIDI.SMF(data);
        } catch (e) {
            console.error("MidiPlayer: Error parsing SMF", e);
            return;
        }
		
        currentPlayer = smf.player();
        if (!midiOut) openMidiOut(currentPortName);
        if (midiOut) {
            currentPlayer.connect(midiOut);
			currentPlayer.play();
			
			currentPlayer.onEnd = function () {
				if (baseName2 != null) {
					console.log(`MidiPlayer: Looping from ${baseName2}s`);
					playMidi(baseName2, baseName2);
				} else {
					currentPlayer = null;
				}
			};
			
            console.log(`MidiPlayer: Playing ${path.basename(filePath)} at volume ${Math.round(volume*100)}%.`);
        } else {
            console.error("MidiPlayer: No MIDI output open to play.");
        }
    }

    // Extend Game_Interpreter to handle plugin commands
    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'MidiPlay') {
			
            let name = args[0] ? String(args[0]) : '';
            if (!name) {
                console.error("MidiPlayer: MidiPlay requires a filename.");
                return;
            }
			
			const name2 = args[1] ? String(args[1]) : null;
			
			const volumeVar = $gameVariables.value(15); // MV variable 15
			const volume = Math.max(0, Math.min(1, Number(volumeVar) / 100.0));		
			
			playMidi(name, name2, volume);
			
        } else if (command === 'MidiStop') {
			if (currentPlayer) {
			currentPlayer.stop();
			currentPlayer = null;
			}
        } else if (command === 'MidiSetPort') {
            if (args[0]) {
                let arg = args.join(' ');
                let portArg;
                if (!isNaN(arg)) {
                    portArg = Number(arg);
                } else {
                    portArg = arg;
                }
                try {
                    let newOut = JZZ().openMidiOut(portArg);
                    if (newOut) {
                        if (midiOut && midiOut.close) midiOut.close();
                        midiOut = newOut;
                        currentPortName = portArg;
                        console.log("MidiPlayer: MIDI Out set to", midiOut.name());

                        if (currentPlayer) currentPlayer.connect(midiOut);
                    } else {
                        console.error(`MidiPlayer: Could not open MIDI port: ${arg}`);
                    }
                } catch (e) {
                    console.error("MidiPlayer: Error opening port:", e);
                }
            }

		} else if (command === 'MidiFadeout') {
			if (currentPlayer && args[0]) {
				fadeoutDuration = Math.max(0, Number(args[0]));
				let step = 1 / (fadeoutDuration / 100);
				let currentVol = 1.0;
				let interval = setInterval(() => {
					currentVol -= step;
					if (currentVol <= 0) {
						currentPlayer.stop();
						currentPlayer = null;
						clearInterval(interval);
					} else {
						for (let i = 0; i < 16; i++) {
							if (midiOut) midiOut.send([0xB0 + i, 7, Math.floor(currentVol * 127)]);
						}
					}
				}, 100);
				console.log(`MidiPlayer: Fadeout over ${fadeoutDuration}ms`);
			}
        }
    };
})();

