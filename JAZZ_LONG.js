/*
 ▄▄▄██▀▀▀▄▄▄      ▒███████▒▒███████▒    ██▓     ▒█████   ███▄    █   ▄████ 
   ▒██  ▒████▄    ▒ ▒ ▒ ▄▀░▒ ▒ ▒ ▄▀░   ▓██▒    ▒██▒  ██▒ ██ ▀█   █  ██▒ ▀█▒
   ░██  ▒██  ▀█▄  ░ ▒ ▄▀▒░ ░ ▒ ▄▀▒░    ▒██░    ▒██░  ██▒▓██  ▀█ ██▒▒██░▄▄▄░
▓██▄██▓ ░██▄▄▄▄██   ▄▀▒   ░  ▄▀▒   ░   ▒██░    ▒██   ██░▓██▒  ▐▌██▒░▓█  ██▓
 ▓███▒   ▓█   ▓██▒▒███████▒▒███████▒   ░██████▒░ ████▓▒░▒██░   ▓██░░▒▓███▀▒
 ▒▓▒▒░   ▒▒   ▓▒█░░▒▒ ▓░▒░▒░▒▒ ▓░▒░▒   ░ ▒░▓  ░░ ▒░▒░▒░ ░ ▒░   ▒ ▒  ░▒   ▒ 
 ▒ ░▒░    ▒   ▒▒ ░░░▒ ▒ ░ ▒░░▒ ▒ ░ ▒   ░ ░ ▒  ░  ░ ▒ ▒░ ░ ░░   ░ ▒░  ░   ░ 
 ░ ░ ░    ░   ▒   ░ ░ ░ ░ ░░ ░ ░ ░ ░     ░ ░   ░ ░ ░ ▒     ░   ░ ░ ░ ░   ░ 
 ░   ░        ░  ░  ░ ░      ░ ░           ░  ░    ░ ░           ░       ░ 
                  ░        ░                 JAM ALL NIGHT LONG!                              
*/



////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////// SETUP ///////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////

var db = firebase.firestore();//initializes firebase

//DataBase Variables
var players;
var score;
var preset = [];

get_db();//downloads DM presets and score

//SETUP MIDI CONTROLLER
navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);//Try to access all MIDI devices
function onMIDISuccess(midiAccess) {//called when the access to the MIDI device is successfull
    var inputs = midiAccess.inputs;
    var outputs = midiAccess.outputs;

    for (var input of midiAccess.inputs.values()) {
        input.onmidimessage = getMIDIMessage; //sets up the MIDI listener
    }
}
function onMIDIFailure() {//called when the access to the MIDI device fails
    console.log('Error: Could not access MIDI devices.');
}

////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////// STATUS //////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////CONSTANTS//////////////////////////////////////////
//Audio
const path = window.location.href.replace("JAZZ_LONG.html","")
const crash = new Audio(path + 'Drums_sounds/cx.wav');
const snare = new Audio(path + 'Drums_sounds/snare.wav');
const hihat = new Audio(path + 'Drums_sounds/HHC.wav');
const hopen = new Audio(path + 'Drums_sounds/HHO.wav');
const kick  = new Audio(path + 'Drums_sounds/kick.wav');
const ride  = new Audio(path + 'Drums_sounds/ride.wav');

const samples = [crash,snare,hihat,hopen,kick,ride];

audioCtx = new AudioContext;

const offset = 36;

//Various strings
const modes = ['Ionian', '-', 'Dorian', '-', 'Phrygian', 'Lydian', '-',  'Mixolydian', '-',  'Aeolian', '-',  'Locrian'];
const instrument_path =['Gpiano/Gpiano',  'Hammond/Hammond', 'Guitar/Guitar'];
const instrument_name =['Gpiano',  'Hammond', 'Guitar'];
const difficulty_level_array = ['EASY', 'MEDIUM', 'HARD'];
const stat = ['right_note', 'wrong_note', 'chords_note', 'tot_note', 'rtr', 'final_score'];

//Drum Machine
const N_drums = 6;
const dm_element_name = ["CRASH","RUL","HHC","HHO","KICK","RIDE"];
const preset_names = ["Preset1","Waltz","","","","",
                      "Preset2","Jazz Waltz","","","","",
                      "Preset3","Rock","Funk","Metal","Bossa Nova","",
                      "Preset4","Blues", "Swing","","","",
                      "Preset5","","","","","",
                      "Preset6","Jazz5","","","",""];
var ctx = RoundVisualizer.getContext("2d"); //canvas context

//Harmonic Section
const all_keys_text = ['C', 'C#','D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B' ];
const array_plotter = [5, 0, 7, 2, 9, 4, 11] //used to assign at each chord_button the right chord

//////////////////////////////////////////VARIABLES//////////////////////////////////////////
var myName = '';
var metric = 4;
var section = 0;
var first_preset = [];
for (i=0; i<6; i++){first_preset[i]= new Array(16).fill(0)};//Initializes the DM with an empty preset
var drum = {N_beats:16,metric_subdivision:4,tempo_bpm:120,go:false,prescaler:0,this_preset:first_preset,alpha:0,timer:0};
var chord_sequence_matrix= [];
for (i=0; i<24; i++){chord_sequence_matrix[i]= new Array(metric).fill(null)} //Creates a matrixwith a maximum of 24 bars
var chord = {KEY:0,PRESET:0,MATRIX:chord_sequence_matrix,SETTIMA:false,NONA:false,N_BAR:0,selected_beat_index:null};
var this_bar = 0;
var this_sub_beat = 0;
var this_beat = 0;
var chord_playout = {note:[], note1:null, note2:null, note3:null, note4:null, note5:null};
var new_chord = [];
var chord_created = null;
var exec = {tasti:[], key:null, punteggio:null, command:null, note:null, velocity:null, actual_note:null};
var ball = {x:15,y:11,vx:0,vy:0.5,control:1};
var keys_handlers = [];
var chord_handlers = [];
var animation = {prev_bar_milliseconds:0, prev_beat_milliseconds:0, lag_beat:0, lag_bar:0, phase_beat:0, phase_bar:0};//serve per le animazioni
var statistics ={right_note: 0, wrong_note: 0, tot_note: 0, chords_note: 0, rtr: 0, final_score: 0};
var drumGain = 0.5; //gain is normalized from 0 to 1
var chordGain = 0.5;
var pianoGain = 0.5;
var difficulty_level = 0;
var played_bar = 0; //numero di bar suonate in esecuzione
var instrument_chord = 0;
var instrument_main = 0;

//Bouncing Ball 
canvas = document.querySelector("#mycanvas")
ctx_B = canvas.getContext("2d")

//SHORTCUTS
var all_sections = document.querySelectorAll(".section");
var all_keys = document.querySelectorAll(".piano_button");
var all_chords = document.querySelectorAll(".chord");
var all_beats = document.querySelectorAll(".beat"); //array che contiene tutti i beat di tutte le battute create
var all_presets = document.querySelectorAll(".preset_el"); //array dei tastini preset
var all_buttons = document.querySelectorAll(".buttons");
var all_exec_beats = document.querySelectorAll(".exec_beat");
var all_exec_bar = document.querySelectorAll(".exec_bar");
var box_key = document.querySelector(".key_box");
var box_mode = document.querySelector(".mode_box");

//////////////////////////////////////////CREATE STUFF//////////////////////////////////////////
generate_stroke_selector();

//////////////////////////////////////////TIMER MANAGEMENT//////////////////////////////////////////
next_frame();
function next_sub_beat(){//timer that goes with the rate of sixteenth
      for (i=0; i<N_drums; i++){
        if(drum.this_preset[i][this_sub_beat]){
          play_drum(i);
        }
      }
      if (this_sub_beat%drum.metric_subdivision == 0) {
        this_beat = (this_sub_beat/drum.metric_subdivision)+this_bar*metric;//update current beat
        render_current_beat(this_beat);//highlight current beat
        animation.prev_beat_milliseconds = Date.now();//Sets to zero the time passed from the previous beat
        
        if(chord.MATRIX[Math.floor(this_beat/metric)][this_beat%metric] != null){
          play_chord (chord.MATRIX[Math.floor(this_beat/metric)][this_beat%metric]);
          chord_created = [];
          check_actual_KEY ();
          render_key_mode();
        }//if there is a chord in the current beat: play chord, update current key
      }
      render_stroke_selector();//Movement of the highlighted little squares(DM)
      this_sub_beat++;
      this_sub_beat = this_sub_beat%drum.N_beats;
      if (this_sub_beat == 0){
        if (section==2){played_bar++}
        if (this_bar == chord.N_BAR-1){ this_bar = 0;}
        else {this_bar = (this_bar + 1)%24;}
        animation.prev_bar_milliseconds = Date.now();//Sets to zero the time passed from the previous bar
      }    
}
function reset_timer(){
  clearInterval(drum.timer);//resets the timer (it is called if there are changes on: bpm, shuffle/straight)
  drum.timer = setInterval(function(){//creates a new timer
      if (drum.go){
          next_sub_beat();
      }
  },60000/(drum.tempo_bpm*drum.metric_subdivision));
}
drum.timer = setInterval(function(){//first initialization of timer(drum.timer is not a timer until this funcion --> if we used reset_timer at first --> problem with clearInterval)
  if (drum.go){
    next_sub_beat();  
  }
},60000/(drum.tempo_bpm*drum.metric_subdivision));
function next_frame(){//Frame rate timer(used for animations in execution page and in DM section)
    requestAnimationFrame(next_frame);
    animation.lag_bar = Date.now() - animation.prev_bar_milliseconds;//milliseconds from last bar
    animation.lag_beat = Date.now() - animation.prev_beat_milliseconds;//milliseconds from last beat
    animation.phase_bar = animation.lag_bar*drum.tempo_bpm/(60000*metric);//"phase" computed between 0 and 1
    animation.phase_beat = animation.lag_beat*drum.tempo_bpm/60000;//"phase" computed between 0 and 1
    ball.y = 100* animation.phase_beat * (animation.phase_beat-1) + 40;//Bouncing Ball
    draw();
    animate_sliding_bars();
    if (drum.go){
        drum.alpha = 2*Math.PI*animation.phase_bar;
        render_round_visualizer();
    }
}
function resync(){//resyncronizes timer animation on start reproduction (DM_play)
  animation.prev_bar_milliseconds = Date.now();
  animation.prev_beat_milliseconds = Date.now();
}

//////////////////////////////////////////DATABASE INTERACTION//////////////////////////////////////////
function get_db(){
  db.collection('preset_DM').doc('preset_DM').get().then(//Download of drum machine's presets
    function (doc){
        preset = JSON.parse(doc.data().data);
    }
  )
  db.collection('Score').doc('Player').get().then(//Downloads names and scores from db
  function (doc){
    players = Object.keys(doc.data());
    score = doc.data();
    render_players();
  }
  )
}
function set_db(){//Upload of names and scores to db
  db.collection('Score').doc('Player').set(score);
}

////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////// CONTROLLER ////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////State Machine//////////////////////////////////////////
function changeSection(nextSection){//Function to change the displayed section
    section = nextSection;
    renderSection();
    render_slider();
    update_slider();
    if (drum.go){DM_stop();stop_bouncing();}

}
function resume(){//Unlocks AudioContext
  audioCtx.resume();
}
name_input.onkeypress = function insert_name(event){//Input of new player "object"
  if (event.keyCode == 13){
      myName = name_input.value;
      score[myName] = 0;
      players.push(myName);
      changeSection(1);//Call to the next section
      set_db();//New player stored on the db  
  }
}
function select_player(index){//Selection between pre-existing players
  myName = players[index];
  changeSection(1);
}
function empty_input(){//Empties input name sextion from "insert your name" on click
    name_input.value = '';
}
function refresh_score(){//Evaluate statistics of the current section 
    right=statistics.right_note;
    wrong=statistics.wrong_note;
    tot=statistics.tot_note;
    chords=statistics.chords_note;
    statistics.rtr= right/tot;
    statistics.rtr=statistics.rtr.toFixed(2);
    statistics.final_score=right-wrong+(0.15*chords);
    if (difficulty_level==0 && statistics.right_note<3*played_bar){//Evaluates the final score with different criteria for different difficulty levels
      statistics.final_score=0.75*right-wrong+0.75*(0.15*chords);
    }
    else if (difficulty_level!=0 && statistics.right_note<6*played_bar){
      statistics.final_score=0.75*right-wrong+0.75*(0.15*chords);
    }
    else {statistics.final_score=right-wrong+(0.15*chords);}
    score[myName] += statistics.final_score; //Assigns the final_score to the active player(adding it to what it is written on the db)
}
function difficulty_selection(){
  if (difficulty_level == 2){difficulty_level = 0;}
  else {difficulty_level++;}
  level_button.innerHTML = difficulty_level_array[difficulty_level];
}
function update_slider(){//set the value of the gain accordingly to the slider
  if (section==1){
    drumgain_comp.onchange = function(){drumGain = drumgain_comp.value/100;render_slider();};
    chordgain_comp.onchange = function(){chordGain = chordgain_comp.value/100;render_slider();};
    pianogain_comp.onchange = function(){pianoGain = pianogain_comp.value/100;render_slider();};
  }
  else if (section==2){
    drumgain_exec.onchange = function(){drumGain = drumgain_exec.value/100;render_slider();};
    chordgain_exec.onchange = function(){chordGain = chordgain_exec.value/100;render_slider();};
    pianogain_exec.onchange = function(){pianoGain = pianogain_exec.value/100;render_slider();};
  }
}

//////////////////////////////////////////Harmonic Section//////////////////////////////////////////
function key_selection(key, index){  //Changes key onclick of the printed keyboard
    key.onclick = function(event) {key_clicked(event, index)}
} 
function key_clicked(event, index){ //Updates the key of chord selection
    all_keys.forEach(function (object){object.classList.remove("selected_key")}); //Deselects the previous key
    all_keys[index].classList.add("selected_key"); //Selects the right key
    chord.KEY = index; //Assigns to "chord.KEY" the index of the key, selected from "all_keys"
    if (chord.PRESET!=0) {preset_creation();} //If a preset is selected it is rebuilt with the new key
    render_chords();
}
all_keys.forEach(key_selection); //Sets all the printed keyboard buttons to listen for the click
settima_button.onclick = function(event) {chord.SETTIMA = !chord.SETTIMA; render_chords()}//Button switch the value of the variable and renders the chords
nona_button.onclick = function(event) {chord.NONA = !chord.NONA; render_chords()}//Button switch the value of the variable and renders the chords
function new_bar (){ //Creation of new bars
  if(chord.N_BAR<24){ //Checks in order not to overcome the maximum number of bars
    chord.N_BAR++; //Updates the number of "active" bars
    created_bar = document.createElement("div"); //Creates a generic div
    created_bar.classList.add("bar"); //Defines the div as a bar
    bar_container.appendChild(created_bar); //Adds the created bar to the bar container
    for (i=0; i<metric; i++){  //Creation of the beats inside the new bar
      created_beat = document.createElement("div"); //Creates a generic div
      created_beat.classList.add("beat"); //Defines the div as a beat
      created_beat.innerHTML = "-"; //Text inside "empty" beats
      created_beat.style.width = 94/metric+'%'; //Beats width definition depending on metric
      created_bar.appendChild(created_beat); //Assigning the new beat to the bar
      }
    all_beats = document.querySelectorAll(".beat"); //Re-evaluates all_beats inserting the new beats
    all_beats.forEach(beat_selection); //Sets all the beats to listen to the click
  }
} //Max number of bars = 24
function remove_bar(){//removes the last bar
  if (chord.N_BAR>0){
    array_bar = document.querySelectorAll(".bar"); //This array is used only locally to get the last bar
    chord.MATRIX[chord.N_BAR-1]= new Array(metric).fill(null); //Empties the row of the matrix related to the last bar(the bar we want to remove)
    array_bar[chord.N_BAR-1].remove(); //Removes the div of the last bar
    chord.N_BAR--; //Updates the number of bars
    all_beats = document.querySelectorAll(".beat"); //Re-evaluates all_beats
    if(document.querySelectorAll(".beat_selected").length==0){chord.selected_beat_index = null;}//De-select the beat if it belongs to the just deleted bar
    all_beats.forEach(beat_selection); //Sets all the beats to listen to the click   
  }
}
add_bar_button.onclick = function(event) { //Calls the creation of a new bar and the de-selection of the actual preset
  new_bar();  
  DM_stop();
  chord.PRESET =0; 
  all_presets.forEach(function (object){object.classList.remove("selected_preset")});
} // add_bar_button
remove_bar_button.onclick = function(event) {//Calls the creation of a new bar and the de-selection of the actual preset
  DM_stop();
  remove_bar(); 
  chord.PRESET =0;
  all_presets.forEach(function (object){object.classList.remove("selected_preset")});
} //remove_bar_button
function beat_selection(object, index){
  object.onclick = function(event){beat_clicked(event, index)}
}
function beat_selection(object, index){
    object.onclick = function(event){beat_clicked(event, index)}
}
function beat_clicked(event, index){ 
  chord.PRESET =0; //deselect preset
  render_selected_beat(index);
  chord.selected_beat_index = index; //Saves the index of the selected beat
}
function chord_selection(object, index){ //When a chord is choosen checks if there is a selected beat and call the function to assign it
  object.onclick = function(event){if (chord.selected_beat_index !=null) {chord_clicked(event, index)}}
}
function chord_clicked(event, index){
    myObject = {tonalita: chord.KEY, semitones:array_plotter[index], seventh: chord.SETTIMA, ninth: chord.NONA}; //Creates the object chord with its characteristics
    chord.MATRIX[Math.floor(chord.selected_beat_index/metric)][chord.selected_beat_index%metric]=myObject; //Assign the chord to the relative beat slot in the matrix
    render_beats();
}
all_chords.forEach(chord_selection); //mette tutti i chord in attesa del click(posso farlo una sola volta tanto gli slot sono sempre quelli, non vengono cancellati)
empty_button.onclick = function(event) {
    if(chord.selected_beat_index != null){chord.MATRIX[Math.floor(chord.selected_beat_index/metric)][chord.selected_beat_index%metric]= null}
    render_beats();
}

//SELEZIONE preset
function preset_selection(preset, index){
  preset.onclick = function(event) {DM_stop(); preset_clicked(event, index)}
}  
function preset_clicked(event, index){ //Acts on preset click
    render_preset_clicked(index);
    chord.PRESET = index+1; //Sets the variable to build the right preset (0 means no preset)
    preset_creation(); //Calls the function that builds the preset
}


all_presets.forEach(preset_selection) 

function preset_creation(){ //Builds the presets inside the matrix and calls the render for the chord sequence section
    while (chord.N_BAR>0){ //Removes all he existing bars
      remove_bar();
    }
    if (chord.PRESET == 1){ //preset 1
      while (chord.N_BAR<4){  //Creates the necessary number of bars
        new_bar();
      }
      /*first chord */
      myObject = {tonalita: chord.KEY, semitones:array_plotter[1], seventh: true, ninth: false}; //Creates the obj chord
      chord.MATRIX[0][0]=myObject; //Puts the chord into the matrix
      /*second chord*/
      myObject = {tonalita: chord.KEY, semitones:array_plotter[4], seventh: true, ninth: false};
      chord.MATRIX[1][0]=myObject;
      /*third chord*/
      myObject = {tonalita: chord.KEY, semitones:array_plotter[3], seventh: true, ninth: false};
      chord.MATRIX[2][0]=myObject;
      /*fourth chord */
      myObject = {tonalita: chord.KEY, semitones:array_plotter[2], seventh: true, ninth: false};
      chord.MATRIX[3][0]=myObject;
    }/*first preset*/
    
    if (chord.PRESET == 2){
      while (chord.N_BAR<4){
        new_bar();
      }
      /*first chord */
      KEY_p = (chord.KEY+2)%12;
      myObject = {tonalita: KEY_p, semitones:array_plotter[2], seventh: true, ninth: false};
      chord.MATRIX[0][0]=myObject;
      /*second chord*/
      KEY_p = (KEY_p+5)%12;
      myObject = {tonalita: KEY_p, semitones:array_plotter[2], seventh: true, ninth: false};
      chord.MATRIX[1][0]=myObject;
      /*third chord*/
      chord.KEY = chord.KEY;
      myObject = {tonalita: chord.KEY, semitones:array_plotter[2], seventh: true, ninth: false};
      chord.MATRIX[2][0]=myObject;
      /*fourth chord */
      myObject = {tonalita: chord.KEY, semitones:array_plotter[1], seventh: true, ninth: false};
      chord.MATRIX[3][0]=myObject;
    }/*second preset*/
    
    if (chord.PRESET == 3){
      while (chord.N_BAR<12){
        new_bar();
      }
      KEY_p = chord.KEY;
      for(r=0; r<12; r=r+2){
        myObject = {tonalita: KEY_p, semitones:array_plotter[3], seventh: true, ninth: false};
        chord.MATRIX[r][0]=myObject;
        myObject = {tonalita: KEY_p, semitones:array_plotter[2], seventh: true, ninth: false};
        chord.MATRIX[r+1][0]=myObject;
        KEY_p = (KEY_p+10)%12;
      }
    }/*third preset*/
    
    if (chord.PRESET == 4){
      while (chord.N_BAR<4){
        new_bar();
      }
      ap = 5;
      for(r=0; r<4; r++){
        myObject = {tonalita: chord.KEY, semitones: array_plotter[ap], seventh: true, ninth: false};
        chord.MATRIX[r][0]=myObject;
        ap--;
      }
    }/*fourth preset*/
    
    if (chord.PRESET == 5){
      while (chord.N_BAR<4){
        new_bar();
      }
      ap = 0;
      for(r=0; r<3; r++){
        myObject = {tonalita: chord.KEY, semitones: ap, seventh: true, ninth: false};
        chord.MATRIX[r][0]=myObject;
        ap= ap+2;
      }
      myObject = {tonalita: chord.KEY, semitones: array_plotter[0], seventh: true, ninth: false};
      chord.MATRIX[r][0]=myObject;
    }/*fifth preset*/
    render_beats();/*render preset*/
}

//////////////////////////////////////////DRUM MACHINE//////////////////////////////////////////
function generate_stroke_selector(){//Generates all the beats in the selector(rows of little squares) 
  document.querySelectorAll('.stroke').forEach(function(obj){obj.remove();});
  document.querySelectorAll('.dm_element').forEach(function(obj){obj.remove();});
  for (i=0;i<N_drums;i++){
      this_row = document.createElement('div');
      StrokeSelector.appendChild(this_row);
      this_element = document.createElement('div');
      this_element.classList.add('dm_element');
      this_element.innerHTML = dm_element_name[i];
      this_row.appendChild(this_element);
      for (j=0;j<drum.N_beats;j++){
          this_stroke = document.createElement('div');
          this_stroke.classList.add('stroke');
          this_row.appendChild(this_stroke);
          if (j==0){this_stroke.classList.add('played_stroke')}
      }
  }
  document.querySelectorAll('.stroke').forEach(function(obj,index){// Assigns to each stroke (squares) onclick: modify this_preset and render 
    obj.onclick = function(){
        drum.this_preset[Math.floor(index/drum.N_beats)][index%drum.N_beats] = !drum.this_preset[Math.floor(index/drum.N_beats)][index%drum.N_beats];
        render_stroke_selector();
    }
  });
}
function straight(){//Button "straight"
    DM_stop();
    drum.metric_subdivision = 4;
    drum.N_beats = metric*drum.metric_subdivision;
    refresh_names();
    generate_stroke_selector();
    reset_timer();
}
function shuffle(){//Button "shuffle"
    DM_stop();
    drum.metric_subdivision = 3;
    drum.N_beats = metric*drum.metric_subdivision;
    refresh_names();
    generate_stroke_selector();
    reset_timer();
}
document.querySelectorAll('.sel2').forEach(function(obj,index){//Buttons '3/4','4/4','5/4' for metric selection
  obj.onclick = function(){
      DM_stop();
      metric = index+3;
      drum.N_beats = metric*drum.metric_subdivision;
      refresh_names();
      generate_stroke_selector();
      for (i=0; i<24; i++){chord_sequence_matrix[i]= new Array(metric).fill(null)} //create matrix with a maximum of 24 bars (0->23)
      for (i=0; i<24; i++){
        if(chord.N_BAR ==0){break}
        else{remove_bar();}
      }
      chord.PRESET =0;
      drum.this_preset = preset[6*(2*index+(4-drum.metric_subdivision))];//choose empty DM preset
      all_presets.forEach(function (object){object.classList.remove("selected_preset")}); 
  }
});
document.querySelectorAll('.sel3').forEach(function(obj,index){//Buttons for preset selection
  obj.onclick = function(){
      set = 4 - drum.metric_subdivision + 2*(metric - 3);
      drum.this_preset = preset[6*set + index];
      render_stroke_selector();
  }
});
function DM_play(){//Buttons "start" both in composition and execution
  play_button.innerHTML = 'STOP';
  play_button.onclick = DM_stop;
  this_sub_beat = 0;
  this_beat = 0;
  this_bar = 0;
  drum.alpha = 0;
  drum.go = true;
  resync();
}
function DM_stop(){//Buttons "stop" both in composition and execution
  play_button.innerHTML = 'PLAY';
  play_button.onclick = DM_play;
  this_sub_beat = 0;//reset all counters
  this_beat = 0;
  this_bar = 0;
  drum.go = false;
  render_current_beat (this_beat);
  box_key.innerHTML = '-';//key suggestion in execution 
  box_mode.innerHTML= '-';//mode suggestion in execution 
  stop_previous_chord();//interrupt sound
  all_exec_bar.forEach(function(obj){obj.style.right = '0%'; obj.style.opacity = 0;});//hide animation leftovers
}
tempo_selector.onchange = function(event){//input tempo
  drum.tempo_bpm = parseInt(event.target.value);//Read inserted value
  if (drum.go == true){DM_stop()}//stop DM if it is running
  reset_timer();
}

//////////////////////////////////////////EXECUTION//////////////////////////////////////////
//chord creation
function create_chord(semitones, tonalita,seventh,ninth){ //Receives the object chord from the matrix and generates the array of audios
  //First build the chord as distances from the fundamental note
  if (semitones == 0 || semitones == 5 || semitones == 7){
      if(seventh == 1){
           if(semitones == 0 || semitones == 5){chord_playout.note = [0,4,7,11];}
           else {chord_playout.note = [0,4,7,10];}
      }
      else{
           chord_playout.note = [0,4,7];
      }
      }
  else if (semitones!= 11){
      if(seventh == 1){
          chord_playout.note = [0,3,7,10];
      }
      else{
          chord_playout.note = [0,3,7];
      }
      }
  else{
      if(seventh == 1){
          chord_playout.note = [0,3,6,10];
      }
      else{
          chord_playout.note = [0,3,6];
      }
  }
  if (ninth == 1){
      if (semitones == 11 || semitones == 4 ){
          chord_playout.note.push(13);
      }
      else{
          chord_playout.note.push(14);
      }
  }
  //Shifting note in relation to the object passed(relative to the right fundamental note of the chord)
  for (i = 0; i < chord_playout.note.length; i++){
      chord_playout.note[i] = chord_playout.note[i] + semitones + tonalita;
  }
  //Chord creation assemblying audio files
  chord_playout.note1 = new Audio(path + instrument_path[instrument_chord] + String(24 + chord_playout.note[0]) + '.wav');
  chord_playout.note2 = new Audio(path + instrument_path[instrument_chord] + String(24 + chord_playout.note[1]) + '.wav');
  chord_playout.note3 = new Audio(path + instrument_path[instrument_chord] + String(24 + chord_playout.note[2]) + '.wav');
  chord_playout.note1.loop = false; 
  chord_playout.note2.loop = false;
  chord_playout.note3.loop = false;
  if (seventh == 1){
      chord_playout.note4 = new Audio(path + instrument_path[instrument_chord] + String(24 + chord_playout.note[3]) + '.wav');
      chord_playout.note4.loop = false;
  }
  if (ninth == 1){
      if (seventh ==1 ){
          chord_playout.note5 = new Audio(path + instrument_path[instrument_chord] + String(24 + chord_playout.note[4]) + '.wav');
      }
      else{
          chord_playout.note5 = new Audio(path + instrument_path[instrument_chord] + String(24 + chord_playout.note[3]) + '.wav');
      }
      chord_playout.note5.loop = false;
  } 
if (chord_playout.note5 && chord_playout.note4){
  new_chord = [chord_playout.note1,chord_playout.note2,chord_playout.note3,chord_playout.note4,chord_playout.note5];
}
else if (chord_playout.note4 && !chord_playout.note5){
  new_chord = [chord_playout.note1,chord_playout.note2,chord_playout.note3,chord_playout.note4];
}
else if (chord_playout.note5 && !chord_playout.note4){
  new_chord = [chord_playout.note1,chord_playout.note2,chord_playout.note3,chord_playout.note5];
}
else{
  new_chord = [chord_playout.note1,chord_playout.note2,chord_playout.note3];
}
  return new_chord;
}

//Bouncing ball
function play_bouncing(){
  ball.control=0;
  draw()
}
function stop_bouncing(){
  ball.control=1;
}

//Get notes played by user and do the various verifications 
function getMIDIMessage(message) { //Receive data from the MIDI message assigning values to variables
    exec.command = message.data[0];
    exec.note = message.data[1];
    exec.velocity = (message.data.length > 2) ? message.data[2] : 0;
    Midi_Message_Received();
}
function Midi_Message_Received(){//Acts in relation to the content of the MIDI message
  if (Math.floor(exec.command / 16) == 9 && exec.velocity != 0) {
    all_buttons.forEach(function (tasto, index) {
        if (index == exec.note - offset) {
            play_midi(index)
            if (drum.go && section == 2){ //Update statics and calls render function for the keyboard
              statistics.tot_note++;
              if (exec.tasti[(index) % 12] ){
                render_played_button(tasto, 0);
                statistics.right_note++;
                note=(index)%12;
                chord_note=chord_playout.note;
                for(i=0;i<chord_note.length;i++){
                  if (note==(chord_note[i]%12)){
                    statistics.chords_note++;
                  }
                }
                
              }
              else{
                render_played_button(tasto, 1);
                statistics.wrong_note++; 
                statistics.tot_note++;
              }
            }
            else if (!drum.go && section == 2){render_played_button(tasto, 0);}//If chord are not playing render the pressed keys as "right"
        }
    })
}
else {//On release of the key by the user stops the playing of the note and re-render the key
    keys_handlers[exec.note-offset].pause();
    keys_handlers[exec.note-offset].currentTime = 0;
    all_buttons.forEach(function (tasto, index) {
        if (index == exec.note - offset ) {
            if(exec.tasti[(index) % 12]){
                render_played_button(tasto, 2);
                render_played_button(tasto, 3);
            }
        else{
          render_played_button(tasto, 3); 
          render_played_button(tasto, 2);//il secondo è per decolorare i tasti suonati quando la base è ferma 
        }  
        }   
    })
}
}
function check_actual_KEY (){//Verify which is the key from which the current(or the last played if still drum.go) chord playing is selected
  exec.key = chord.MATRIX[Math.floor(this_beat/metric)][this_beat%metric].tonalita;
  selected_scale(exec.key);
  if (section==2) {all_buttons.forEach(render_scale);}
}
function selected_scale(scale){//Assign true values to the keys of the "right" scale given the current key
  for (i=0; i<12; i++){
    if (i==(scale+0)%12 || i==(scale+2)%12 ||i==(scale+4)%12 ||i==(scale+5)%12 ||i==(scale+7)%12 ||i==(scale+9)%12 ||i==(scale+11)%12) {
      exec.tasti[i] = true;
    }
    else {exec.tasti[i] = false}
  }
}

//Last page can refresh it all if finished
function reset (){
  location.reload();
}

////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////// RENDER //////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////State Machine//////////////////////////////////////////
renderSection(0);
function renderSection(){//Changes showed window
    //HIDE ALL SECTIONS
    all_sections.forEach(function disappear(obj){
        obj.style.display = "none";
    });
    //SHOW THE RIGHT ONE
    if (section == 0){
        intro.style.display = "inline";    
    }
    if (section == 1){
        composition.style.display = "inline";
        render_chords();
    }
    if (section == 2){
        execution.style.display = "inline";    
    }
    if (section == 3){
        statistic.style.display = "inline";    
    }
    if (section == 4){
      final.style.display = "inline";    
  }
}
function render_players(){//Shows the names of the pre-existing players on the intro section
  document.querySelectorAll('.player').forEach(function(obj){obj.remove()});
  players.forEach(function(name,index){
      myDiv = document.createElement('div');
      internal_container_names.appendChild(myDiv);
      myDiv.innerHTML = name;
      myDiv.onclick = function(){select_player(index)};
      myDiv.classList.add('player');
  }
  )
}
function switch_instrument(idx){//Render the correct name of the actual instrument on the selection buttons
  if(idx==0){if(instrument_chord==instrument_name.length-1){instrument_chord=0;} else{instrument_chord++;}; C_I.innerHTML = instrument_name[instrument_chord];}
  else if(idx==1){if(instrument_main==instrument_name.length-1){instrument_main=0;} else{instrument_main++;};; M_I.innerHTML = instrument_name[instrument_main];}
}

////////////////////////////////////////////Harmonic Section//////////////////////////////////////////
function render_chords(){ //When invoked calls for each chord slot(in the chord selection) the function that renders in it the correct chord
  all_chords.forEach(assign_chord_to_block);
}
function assign_chord_to_block(block, index_chord){ //Assign the chord to its box
    my_string = all_keys_text[(array_plotter[index_chord]+chord.KEY)%12] //Takes the name of the chord from all_keys_text starting from the ndex of the chord and adding the key, the %12 is to go back to the start of the array if the index overcome its length
    if(index_chord<=5 && index_chord>=3){my_string = my_string +'m'}
    if(index_chord==6){my_string = my_string +'dim'}
    if(index_chord<2 && chord.SETTIMA){my_string = my_string + ' maj7'}
    if(index_chord!=0 && index_chord!=1 && chord.SETTIMA){my_string = my_string+'7'}
    if(index_chord>4 && chord.NONA){my_string = my_string + ' 9b'}
    if(index_chord<=4 && chord.NONA){my_string = my_string+' 9'}
    block.innerHTML= my_string; //Writes the string in the block
}
function render_beats(){//Writes the chords in the beats reading them from the matrix
    all_beats.forEach(function (obj,idx){
        var my_string;
        data = chord.MATRIX[Math.floor(idx/metric)][idx%metric]; 
        obj.innerHTML = chord_to_string(data);
    })
}
function render_current_beat(index){//Higlight the current beat(beat in reproduction)
  all_beats.forEach(function (object){object.classList.remove("current_beat")}); 
  if (all_beats.length !=0 && drum.go){ all_beats[index].classList.add("current_beat");}
}
function render_selected_beat(index){//Highlight the selected beat which you are assigning a chord to
  all_presets.forEach(function (object){object.classList.remove("selected_preset")}); //deselect all the presets
  all_beats.forEach(function (object){object.classList.remove("beat_selected")}); //deselects the previous selected beat 
  all_beats[index].classList.add("beat_selected"); //Effective highlight of the beat
}
function render_preset_clicked(index){
  all_presets.forEach(function (object){object.classList.remove("selected_preset")}); //Deselects all the presets
  all_presets[index].classList.add("selected_preset"); //Selects the right preset
}

//////////////////////////////////////////Drum Machine//////////////////////////////////////////
refresh_names();
function refresh_names(){ //Show preset names
  document.querySelectorAll('.sel3').forEach(function(obj,index){
      set = 4 - drum.metric_subdivision + 2*(metric - 3);//Offset of the indexes
      obj.innerHTML = preset_names[6*set + index];//Write the actual names
  })
}
function render_stroke_selector(){//Show selected beats on stroke selector
  document.querySelectorAll('.stroke').forEach(
      function(obj,index){//Turn green all the beats in the preset
          obj.classList.toggle('selected_stroke',(drum.this_preset[Math.floor(index/drum.N_beats)][index%drum.N_beats]));
          obj.classList.toggle('played_stroke',index%drum.N_beats==this_sub_beat);
      }
  );
}
ctx.strokeStyle = "#d41313";//Radar "hand" color
ctx.lineWidth = 5;//Radar "hand" thickness
function render_round_visualizer(){//Update radar
    W = RoundVisualizer.width;
    H = RoundVisualizer.height;
    ctx.clearRect(0, 0, W, H);//Clear everything
    render_dots();//Show the dots
    ctx.beginPath();
    ctx.strokeStyle = "#d41313"
    ctx.moveTo(W/2,H/2);//Start from center of canvas
    ctx.lineTo(Math.round(W/2+W/2*Math.sin(drum.alpha)),Math.round(H/2-H/2*Math.cos(drum.alpha)));//Draw the radar "hand"
    ctx.stroke();
}
function render_dots(){//Create a dot for each instrument and for each beat
  for (i=0; i<N_drums; i++){
      for (j=0; j<drum.N_beats; j++){
        if (drum.this_preset[i][j]){
            create_dot(i,j);
        }
    }
  }
}
function create_dot(this_drum, beat){//Create a dot on radar
  radius = RoundVisualizer.width/2;//Radius of outer circle
  rho = radius*(this_drum+1)/(N_drums+1);//Radius at which to create a dot
  theta = 2*(Math.PI)*beat/drum.N_beats;//Angle
  centerY = radius-rho*Math.cos(theta);
  centerX = radius+rho*Math.sin(theta);
  draw_circle(centerX,centerY,beat);
}
function draw_circle(centerX,centerY,beat){//Draw a round dot
  ctx.beginPath();
  ctx.moveTo(centerX+5,centerY);//Start from right (5px right wrt the center)
  ctx.arc(centerX, centerY, 5,0,2*Math.PI);//Draw a full arc
  if(beat==(this_sub_beat+(metric*drum.metric_subdivision)-1)%(metric*drum.metric_subdivision)){//If the beat is being played now
      ctx.fillStyle = 'red'; //Turn the dot red
  }
  else{
      ctx.fillStyle = 'green';
  }
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#003300';
  ctx.stroke();
}

//////////////////////////////////////////Bouncing Ball//////////////////////////////////////////
function draw() {//Render the bouncing ball
  if(ball.control==0){//Neg logic: if the ball should bounce
    ctx_B.beginPath();
    ctx_B.clearRect(0,0,30,60);//Clear canvas
    ctx_B.fillStyle = 'coral';
    ctx_B.arc(ball.x,ball.y,10,0,Math.PI * 2);//Draw the ball at height ball.y
    ctx_B.fill();
    ctx_B.stroke();
  }
  if (ball.control==1){//Else, if the animation is stopped
    ctx_B.clearRect(0,0,30,60);//Clear canvas
  }
}

//////////////////////////////////////////Execution Piano//////////////////////////////////////////
function render_played_button(tasto, condition){//Render(and remove) the key pressed by the user in the correct colour depending if it is right or wrong
  if (condition==0){tasto.classList.add('played')}
  else if (condition==1){tasto.classList.add('wrong')}
  else if (condition==2){tasto.classList.remove('played')}
  else if (condition==3){tasto.classList.remove('wrong')}
}
function render_scale(obj, index){//Render the keys of the printed keyboard if they belong to the right scale
  if(difficulty_level!=2){obj.classList.toggle("choosen", exec.tasti[(index) % 12]);}
}
function render_empty_scale(){
  all_buttons.forEach(function (object){object.classList.remove("choosen")});
}
function render_key_mode(){ //Render name of current key and modal scale
  box_key.innerHTML= all_keys_text[exec.key];
  index = chord.MATRIX[Math.floor(this_beat/metric)][this_beat%metric].semitones;
  my_string = all_keys_text[(index+exec.key)%12]+' - '+ modes[index];
  box_mode.innerHTML =  my_string;
}

//////////////////////////////////////////Moving Bars//////////////////////////////////////////
function create_all_bars(){//Creates the moving bars
  document.querySelectorAll(".exec_bar").forEach(function(obj){obj.remove()}); //Deletes all the bars 
  for (k=0; k<chord.N_BAR; k++){  //Creates all the bars
    exec_new_bar (k);
  }
  all_exec_bar = document.querySelectorAll(".exec_bar");
}
function chord_to_string(data){//Given an object "chord" gives back the string that describes it
  var my_string;
  if (data == null){my_string = "-"}
  else{
    index_chord = array_plotter.indexOf(data.semitones);
    my_string = all_keys_text[(data.tonalita + data.semitones)%12];
    if(index_chord<=5 && index_chord>=3){my_string = my_string +'m'}
    if(index_chord==6){my_string = my_string +'dim'}
    if(index_chord<2 && data.seventh){my_string = my_string + ' maj7'}
    if(index_chord!=0 && index_chord!=1 && data.seventh){my_string = my_string+'7'}
    if(index_chord>4 && data.ninth){my_string = my_string + ' 9b'}
    if(index_chord<=4 && data.ninth){my_string = my_string+' 9'}
  }
  return my_string;
}
function exec_new_bar (index){ //Create a moving bar
  created_bar = document.createElement("div"); //Creates the bar as a generic div
  created_bar.classList.add("exec_bar"); //Define the div as bar
  exec_bar_container.appendChild(created_bar); //Adds the created bar to its container
  for (i=0; i<metric; i++){  //Creates the beats (the number depends on metric)
    created_beat = document.createElement("div"); //Creates the bar as a generic div
    created_beat.classList.add("exec_beat"); //Define the div as bar
    myChord = chord.MATRIX[index][i];
    created_beat.innerHTML = chord_to_string(myChord); //Insert the chord
    created_beat.style.width = 94/metric+'%'; //Assigning width in relation to the number of beats
    created_bar.appendChild(created_beat); //Assigning the beat to its bar
  }
  all_exec_beats = document.querySelectorAll(".exec_beat"); //Redefine all_beats inserting the beats of the new bar
}
function animate_sliding_bars(){//Computes the position of the sliding bar moving them
  if (ball.control == 0 && chord.N_BAR!=0){
    all_exec_bar[(this_bar + 1)%chord.N_BAR].style.right = (25 * animation.phase_bar) + "%";
    all_exec_bar[(this_bar + chord.N_BAR - 1)%chord.N_BAR].style.right = (50 + 25 * animation.phase_bar) + "%";
    all_exec_bar[(this_bar + 2)%chord.N_BAR].style.right = 0 + "%";
    all_exec_bar[this_bar].style.right = (25 + 25 * animation.phase_bar) + "%";
    all_exec_bar.forEach(function(obj){
      pos = parseInt(obj.style.right);
      op = Math.min(1,2 - (Math.abs(pos-36)/18));
      obj.style.opacity = op;
    })
  }
}

//////////////////////////////////////////Slider//////////////////////////////////////////
function render_slider(){//Reads the value of gain and assigns it to the slider so that it is in the correct position
  if (section==2){
    pianogain_comp.value = pianoGain*100;
    drumgain_comp.value = drumGain*100;
    chordgain_comp.value = chordGain*100;
  }
  if (section==1){
    pianogain_exec.value = pianoGain*100;
    drumgain_exec.value = drumGain*100;
    chordgain_exec.value = chordGain*100;
  }
}

//////////////////////////////////////////Final and Statistics//////////////////////////////////////////
function render_statistics(){//Prints the statistics on screen
  row=document.querySelectorAll('.tb');
  for(i=0; i<stat.length; i++){
    row[i].innerHTML=String(statistics[stat[i]]);
    }
  }
function render_score(){
  db.collection('Score').doc('Player').get().then(//Download the scores
    function (doc){
      players = Object.keys(doc.data());
      score = doc.data();
      var score_sortable = [];
      for (const name in score){
          score_sortable.push([name,score[name]]);//Changes it from object to list in order to be able to order them
      }
      score_sortable.sort(function(a, b) {//Reorder the score in decreasing order of final_score
        return b[1] - a[1];
      });
      score_sortable.forEach(function(obj,idx){//Prints the ordered score
        myRow = document.createElement('div');
        if(idx==0){
          myRow.classList.add('first');
        }
        if(idx==1){
          myRow.classList.add('second');
        }
        if(idx==2){
          myRow.classList.add('third');
        }
        if(idx!=1 && idx!=2 && idx!=0){
          myRow.classList.add('score_row');
        }
        high_score.appendChild(myRow);
        myRow.innerHTML = obj[0] + ' ' + obj[1].toFixed(2); //name, space, points
      })
    } 
  )  
}

////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////// SOUND ///////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////

function play_chord (obj){
  stop_previous_chord();
  chord_created = create_chord(obj.semitones, obj.tonalita, obj.seventh, obj.ninth);
  for (i=0; i<chord_created.length; i++) {
    chord_created[i].volume = chordGain;
    chord_created[i].play();
    chord_handlers[i] = chord_created[i];
  }
}

function play_midi(index){
  exec.actual_note = new Audio(path + instrument_path[instrument_main]+ index +'.wav');
  exec.actual_note.loop = false;
  keys_handlers[index] = exec.actual_note;
  exec.actual_note.volume = pianoGain;
  exec.actual_note.play();
}

function play_drum(index){
    mySound = samples[index].cloneNode();
    mySound.onended = function(){mySound.remove()};
    mySound.volume = drumGain;
    mySound.play();
}

function stop_previous_chord(){
  chord_handlers.forEach(function(obj,idx){
    if (obj != null){
      chord_handlers[idx].pause();
      chord_handlers[idx].currentTime = 0;
      chord_handlers[idx] = null;
    }
  })
}

