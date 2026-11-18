(()=>{
"use strict";
const VERSION=2,MAX_TURNS=10,MIN_CHAPTER_TURNS=4,MAX_HISTORY=100,LOCAL_TURNS=4;
const STATS=["str","sta","dex","agi","int","wis","cha"];
const DIFFICULTY_DC=Object.freeze({easy:11,standard:13,hard:15});
const LOCAL_ARCS=Object.freeze({
 "night-harbor":[
  {id:"salt-ledger",title:"The Salt Ledger",objective:"Discover why the east quay cargo account was altered before the next tide.",site:"the east quay tallyhouse",contact:"Mara, the night weighmaster",opening:"A cargo account has been changed after the harbor seal was set. The crew named in the book swears their load was counted correctly, and the next vessel is already tying up.",beats:["A smear of lampblack appears beside the altered entry; Mara recognizes the mark from a private tally used after the books close.","The mark leads to a warehouse where the cargo is present, but the person who signed for it is nowhere in sight.","The weighmaster, the accused crew, and the clerk are finally in one place. The argument is loud enough to draw the watch, and the tide is turning."],successEnding:"You establish who altered the record and keep the wrong crew from carrying the blame. Mara offers to put your name forward when the harbor needs a steady hand.",partialEnding:"You stop the innocent crew from being punished, but the person behind the alteration slips away before the watch arrives.",thread:"Who paid to alter the east quay cargo account?"},
  {id:"low-tide-lanterns",title:"Lanterns at Low Tide",objective:"Find who is signaling from the breakwater after the harbor bells go quiet.",site:"the western breakwater",contact:"Tovin, a ferry pilot on the late watch",opening:"A chain of hooded lanterns appears beyond the breakwater whenever the harbor bells fall silent. Tovin has seen it three nights running, but each time the watch arrives the lights are gone.",beats:["The lanterns are not answering one another; they are marking a safe path through water that should be too shallow for a boat.","A ferry hand admits someone has been asking which crews carry sealed cargo, then refuses to say who hired them.","The next low tide will expose the channel. Tovin is ready to guide a boat through it, while a shadow moves on the far rocks."],successEnding:"You uncover the hidden channel and bring its users into the open before the next crew can be drawn into the scheme.",partialEnding:"You keep the late-watch crews safe, but the lanterns go dark before their owner can be identified.",thread:"Who uses the hidden channel beyond the western breakwater?"}
 ],
 underdocks:[
  {id:"vacant-lift",title:"The Vacant Lift",objective:"Learn why the Underdocks lift keeps arriving empty at the upper platform.",site:"the lower lift landing",contact:"Hessa, a lift counter",opening:"The lift cage arrives at the lower landing with its chain warm and its lamps burning, but no one inside. Hessa has counted every trip; one passenger is missing from the tally and from the streets above.",beats:["Fresh grit on the cage floor matches the older passage, not the public shaft. Someone stepped out before the platform reached its stop.","A lift hand remembers a second bell beneath the machinery, answered from a sealed service walk.","The counterweight shudders as the lift starts another trip. Hessa hears a voice below and asks you to choose between stopping the cage or following the sound."],successEnding:"You find the hidden service walk and bring the missing rider back to the landing. The lift crew agrees to inspect every shaft before reopening the lower run.",partialEnding:"You stop the lift from taking another rider, but the missing passenger remains somewhere beyond the sealed service walk.",thread:"Where does the lower service walk lead, and who was using it?"},
  {id:"cistern-echo",title:"Voices in the Cistern",objective:"Find the source of voices heard beneath the Underdocks water stores.",site:"the old cistern gallery",contact:"Brel, a water carrier",opening:"Water carriers refuse to use one cistern after hearing a voice answer from below. The gallery is safe by the posted marks, yet the sound comes from behind an older wall that no current map explains.",beats:["The voice answers only when the water wheel slows; its rhythm matches a work call used by the old tunnel crews.","Brel's route notes show that fresh water has been diverted through a narrow side channel, and someone has been maintaining it.","The water level begins to rise against a blocked grate. The sound behind the wall is now close enough to understand, but the gallery is filling."],successEnding:"You open a safe drain and discover who was trapped beyond the old wall. The carriers can return to work while the passage is surveyed properly.",partialEnding:"You clear the rising water and keep the cistern usable, but the voice falls silent behind the sealed stone.",thread:"Who was calling from beyond the old cistern wall?"}
 ],
 penshaw:[
  {id:"fallen-bough",title:"The Fallen Bough",objective:"Settle a dispute over a storm-fallen bough before the path wardens close the woodland road.",site:"the rain-split woodland path",contact:"Eryn, a path warden",opening:"A storm has brought down a huge bough across a woodland road. Two groups claim the timber for different reasons, and the wardens will close the path unless someone learns what happened before the storm.",beats:["The cut marks are too clean for a storm break; the bough was weakened before the rain came.","A quiet trail leads to a sheltered glade where a traveler has been sleeping beside the road, afraid to return to either camp.","Both claimants arrive at the glade at once. The argument has shifted from ownership to fear that the road itself is no longer safe."],successEnding:"You establish how the bough fell and find a use for the timber that keeps the road open. Eryn asks you to help settle the next dispute before it grows.",partialEnding:"You keep the argument from becoming a fight and reopen a footpath, but the reason the bough was weakened remains uncertain.",thread:"Who weakened the fallen bough before the storm?"},
  {id:"fern-road",title:"The Fern Road",objective:"Find why travelers keep leaving the marked path through the fernwood.",site:"the fernwood boundary",contact:"Sael, a trail keeper",opening:"Travelers return from the fernwood by different paths and describe the same distant bell. Sael has found no bell on the map, but new footprints keep crossing the boundary stones after dusk.",beats:["The footprints are not wandering; they form a careful loop around ground where the ferns have been pressed flat.","A traveler admits following a voice that sounded like a companion who vanished years ago, then found their own tracks leading away.","The bell rings once from inside the loop. Sael wants the boundary closed, while a traveler steps toward the sound."],successEnding:"You mark a safe route and learn who has been drawing travelers off the road. Sael leaves the boundary open under a proper watch.",partialEnding:"You guide the travelers back to the road, but the bell still rings beyond the boundary stones.",thread:"What is calling travelers away from the fern road?"}
 ],
 faelindral:[
  {id:"branchlight",title:"A Light Between Branches",objective:"Learn why a wandering branchlight keeps drawing night travelers from the city walkways.",site:"the eastern canopy walk",contact:"Ilan, a bridge tender",opening:"A pale branchlight has appeared beyond the eastern canopy walk. It never holds still, and two night travelers have followed it into unfinished boughways before the bridge tenders could reach them.",beats:["The light pauses wherever a handrail is broken, as though it is showing the places the city builders left unfinished.","A tender recognizes the path of an old maintenance line, but its far end was sealed after a fall years ago.","The light gathers at the sealed landing while a strong wind moves through the upper branches. The bridge tender will not let anyone cross without a plan."],successEnding:"You secure the unfinished walk and learn why the branchlight kept returning to it. The bridge tenders can repair the route before another traveler is lost.",partialEnding:"You bring the night travelers home and close the unsafe walk, but the branchlight still appears beyond the sealed landing.",thread:"Why does the branchlight return to the sealed landing?"},
  {id:"rootway-market",title:"The Rootway Measure",objective:"Find who is diverting goods from a market route beneath the city boughs.",site:"the rootway market steps",contact:"Veya, a basket merchant",opening:"Several small traders arrive with empty baskets after taking the rootway under the western boughs. No one has seen a robber, yet each load is lighter at the same turn in the passage.",beats:["The lost goods were never taken from the baskets; their weight was recorded twice at one of the old measuring stones.","A young porter is copying the false marks under orders and has been promised that no one will blame them.","The traders and the porter meet at the measure stone. The true weight is easy to show, but the person giving the orders has noticed your inquiry."],successEnding:"You expose the false measure and make the route safe for the small traders again. Veya helps settle the account openly.",partialEnding:"You restore some of the missing goods and clear the porter of blame, but the person behind the false measure escapes.",thread:"Who ordered the rootway measure altered?"}
 ],
 "ail-vorith":[
  {id:"silent-runner",title:"The Silent Runner",objective:"Find the missing courier whose message never reached the lower council walk.",site:"the lower council approach",contact:"Darel, a passage guide",opening:"A courier left before the last watch and never reached the lower council walk. Darel knows the usual route by heart, but the marks on the stone show someone turned away from the public passage.",beats:["The turned mark was made deliberately, then partly scraped away. The courier expected to be followed.","A passage guide recognizes the scrape as a warning used by crews who find a route unsafe, not as a sign of an ambush.","A second warning appears beyond the old arch. The courier's lamp is visible ahead, and the stone around it has begun to shift."],successEnding:"You reach the courier and guide them back through a stable passage. Their message can be delivered without exposing the route they were protecting.",partialEnding:"You find the courier's lamp and clear a safe way out, but the courier has moved deeper before you can reach them.",thread:"What danger forced the courier off the council approach?"},
  {id:"old-door",title:"The Door That Answers",objective:"Learn why a sealed stone door has started answering knocks from inside.",site:"the abandoned eastern gallery",contact:"Serrit, a quiet stone tender",opening:"A sealed stone door has begun answering when the night crews pass the eastern gallery. The sound is measured, never frantic. Serrit says the door has stood untouched for generations, but fresh dust lies on its inner seam.",beats:["The knocks repeat an old shift pattern. Someone on the other side knows when the passage crews change.","Serrit finds a second seam beneath the stonework, too narrow for a person but wide enough for air and sound.","The answering knocks stop. A faint scrape comes from the other side, and the night crew is waiting for you to decide whether to open, seal, or call for help."],successEnding:"You discover who has been signaling and keep the gallery from becoming a danger to the night crews. Serrit marks the passage for a careful inspection.",partialEnding:"You reinforce the door and keep the crew safe, but the voice on the other side does not answer again.",thread:"Who has been signaling from beyond the eastern gallery?"}
 ]
});
const GENERIC_LOCAL_ARC_IDS=Object.freeze(["waystation-appeal","marked-passage"]);
// Original regional adventures. Each lead names something the player can act on;
// each settlement offers three different things worth fighting for at the end.
const LOCAL_ROUTES={
 "salt-ledger":{
  leads:["the paired quay tallies","the deckhand who signed the load","the warehouse gangway"],
  finds:["Both tallies carry the same knife nick. Only the tally kept ashore has a second figure in ink.","The deckhand remembers signing with a thumbprint. The receipt in the book bears a neat signature.","Wet tracks end by a locked warehouse door; the ship's hold is already dry."],
  ends:[
   ["Set the paired tallies side by side","Name the false entry before the harbor watch","Mara strikes the false entry in red. The crew leaves with its pay and the clerk must answer for the second figure.","The watch agrees to hold the account open. The crew can sail, but its pay stays in the strongbox."],
   ["Give the deck crew a private hearing","Bargain for the crew's release","The crew sails on the tide. Mara keeps the deckhand's name out of the public book; the false account remains for another day.","The crew gains one more tide to make its case. The deckhand stays ashore as surety."],
   ["Arrange a watch at the storehouse","Follow the goods to their receiver","The watch catches the receiver opening the missing consignment. The crate seal will speak for the accused crew.","The receiver abandons the crate and runs. You recover the load, but have no name for the inquiry."]]},
 "low-tide-lanterns":{
  leads:["the ferry's tide board","the last pilot ashore","the breakwater at water level"],
  finds:["The lamps appear at the same depth of water, never the same hour.","The pilot heard an oar knock three times before the first lamp opened.","A wet painter trails from an iron ring below the harbor wall. A shallow boat has tied up here."],
  ends:[
   ["Mark each light against the tide board","Publish a chart of the secret channel","At dawn the ferry crews hang your chart beside the tide board. No boat can use the channel unseen again.","You mark the entrance, but the outer rocks disappear beneath the incoming tide before you can fix their bearings."],
   ["Call in the late-watch ferries","Escort the next crew through the dark","Every ferry returns with its crew. The pilots agree to cross in pairs; whoever lit the lamps slips away.","The last ferry spends the tide grounded by the wall. Everyone is safe, but the night crossing must close."],
   ["Find a place to land on the rocks","Reach the lantern keeper before the tide turns","You find the lookout counting sealed cargoes and recover a list of ships from the hollow of the lantern.","The lookout escapes across the rocks. You extinguish the lantern before it can signal another boat."]]},
 "vacant-lift":{
  leads:["the cage floor and its guide shoes","the relief hand at the bell","the lower maintenance ledge"],
  finds:["A scrape crosses the cage sill halfway up the door, too high for either public landing.","The relief hand heard a second bell after the cage had already left the lower platform.","Through the guide rail you see a bootprint in the dust of a landing the lift should never serve."],
  ends:[
   ["Match the stray bell to the lift tally","Expose the illicit stop to the lift crew","Hessa rings the hidden stop in front of the crew. They chalk it onto the shaft plan and send a search party down.","The crew hears the second bell but cannot place the landing. The next shift posts a listener in the shaft."],
   ["Set up a line for the missing rider","Haul the rider back to the landing","Two tugs answer. The rider comes over the rail alive, still clutching the lunch tin Hessa counted on the outbound trip.","The line is too short, but the rider answers from a dry shelf. Hessa holds the cage while the crew fetches a longer rope."],
   ["Brace the counterweight above the service walk","Stop the runaway cage at the hidden landing","The brake bites. The cage becomes a bridge to the service walk, and the crew can sweep it end to end.","The cage jams a span short. You secure the landing against another accident, but the service walk stays out of reach."]]},
 "cistern-echo":{
  leads:["the wheel's old shift marks","the carrier on the dawn draw","the dry lip below the grate"],
  finds:["The wheel stalls at an old chisel mark. In the silence someone behind the wall calls for air.","The carrier delivers water to one more bucket than appears on Brel's rounds.","A fresh wooden wedge holds a trickle of clean water away from the main cistern."],
  ends:[
   ["Sound the buried channel","Trace who has been tending the water route","The sound leads to a hand-cut sluice. Its keeper shows Brel how to drain the passage without fouling the cistern.","You mark the sluice for the next dry season. Its keeper will only answer from behind the stone."],
   ["Rig a sling behind the grate","Bring the caller up before the gallery floods","A soaked tunnel hand catches the sling. The carriers give up their bucket ropes to pull her clear.","The caller reaches an air shelf. Brel keeps talking to her while the carriers lower the water by hand."],
   ["Clear the catch on the spill gate","Divert the flood away from the water stores","The overflow takes the surge. Fresh water runs clear from all three spouts before the carriers' next round.","The upper store stays clean. The lower cistern has to be closed until the mud settles."]]},
 "fallen-bough":{
  leads:["the split beneath the fallen bough","the last cart driver through","the uphill side of the fallen trunk"],
  finds:["Sap has dried around a row of shallow cuts: the wood was scored before the storm.","The cart driver heard chopping after the wardens had sent the timber crews home.","A narrow track leads uphill from the break to a small shelter under the roots."],
  ends:[
   ["Lay out a section of the cut wood","Show both camps how the bough was felled","The two camps see where the axe bit before the storm. Eryn opens an inquiry, and neither camp can take the timber as stormfall.","The cut wood settles the timing, but nobody can name the hand that held the axe. The timber stays in the wardens' keeping."],
   ["Give the glade's traveler safe company","Bring the witness out under your protection","The traveler walks openly beside Eryn. Both camps hear the same account, and the shelter in the glade is left untouched.","The traveler chooses the wardens' shelter over a public hearing. The camps disperse without an answer."],
   ["Set ropes around the split trunk","Turn the bough into a crossing for the road","The bough settles into place over the washout. Both camps need the crossing more than they need the timber.","You win room for a footpath. Carts will have to wait for the wardens to move the trunk."]]},
 "fern-road":{
  leads:["the tracks around the first boundary stone","the traveler with fern spores on their coat","the edge of the flattened fern bed"],
  finds:["The same heel crosses the stone twice, heading out both times. Someone has made a loop of the path.","The traveler says the bell called in a familiar voice, but would not answer a question.","Below the fern heads the ground is level; only the tall fronds conceal the return path."],
  ends:[
   ["Plot the footprints around the ringing ground","Mark the false turning where everyone can see it","Sael sets a stone at each false turn. Travelers can hear the bell now without losing the road.","The first turn is marked. Sael closes the outer loop at dusk, when the other tracks disappear."],
   ["Tie a guide line to the boundary","Bring the traveler back from the ringing ferns","Your line goes taut. The traveler follows it home and tells Sael what the bell promised them.","The traveler returns at first light. You spend the night at the boundary answering their calls."],
   ["Approach the sound below the fern heads","Find what rings inside the loop","You uncover a hollow bough strung with old road bells. Sael removes them, but neither of you forgets the voice.","The sound moves on before you reach it. You close the dangerous crossing and leave the bell beyond the boundary."]]},
 "branchlight":{
  leads:["the handrail repair marks","the tender who worked the last crossing","the maintenance walk beneath the bridge"],
  finds:["Each fresh repair mark faces an unfinished span. The light has been stopping at the gaps.","The tender recalls a lamp left on the maintenance line after the old walkway fell.","A frayed guide cord runs below the bridge, all the way to the sealed landing."],
  ends:[
   ["Compare the builders' marks to the light's path","Reveal the forgotten gaps to the bridge tenders","The tenders map the unfinished spans. The pale light guides their first inspection instead of another lost traveler.","The nearest gap is marked. The eastern walkway must close each night until the others can be surveyed."],
   ["Station guides at the two loose handrails","Guide the stranded travelers home","From rail to rail each traveler passes a guiding hand. All reach the lit walk before the wind rises.","The travelers shelter on the next platform. Ilan stays with them until the wind drops."],
   ["String a safety line across the last span","Reach the branchlight on the sealed landing","The light falls still beside an old work lantern. You bring the lantern back to Ilan; the walkway goes dark.","The wind pulls the line sideways. You secure the broken rail and leave the light on its high landing."]]},
 "rootway-market":{
  leads:["the marks on the measuring stone","the basket seller last in the queue","the turn below the weighing steps"],
  finds:["A shallow second notch adds a load to the measure every time a basket turns on the stone.","The seller was charged once at the steps and again below, by someone claiming to work for the scale keeper.","A chalk line below the steps tells porters which baskets are to be weighed twice."],
  ends:[
   ["Set aside one basket of known weight","Demonstrate the false measure to the market","The basket acquires weight without changing hands. The market removes the false measure before the next trading day.","The weighing is suspended. The traders recover today's overcharge, but old accounts still stand."],
   ["Find someone willing to stand beside the porter","Guarantee a hearing for the young porter","With a merchant at each shoulder, the porter names who gave the orders. Nobody can quietly lay the blame on them.","Veya gives the porter shelter. The traders agree to hear them out when tempers cool."],
   ["Wait beside the second chalk line","Follow the takings to the person giving orders","You follow the overcharge to a private counting table. Its keeper must return the traders' money in public.","The keeper takes flight, leaving the last day's takings on the table. Earlier losses remain unpaid."]]},
 "silent-runner":{
  leads:["the scrape beneath the route mark","the gate hand who saw the courier leave","the stone ledge beside the council passage"],
  finds:["A fingernail has traced a warning beneath the false turn. It points away from a split in the floor.","The gate hand recalls the courier stopping to send two younger runners the long way around.","Dust has settled everywhere but a narrow strip by the wall. Someone hugged the ledge to cross."],
  ends:[
   ["Trace the fault back to the first warning","Mark the unstable passage for the council crews","Your marks link the warnings from end to end. The council closes the faulted walk before the stone gives way.","Darel closes the near arch. Until the fault can be traced, every runner must take the long road."],
   ["Ready a lamp and a line for the courier","Guide the courier out of the shifting passage","The courier passes the lamp back to you, then takes your hand. Darel counts both of you through the arch.","The courier reaches a stable recess. Darel stands watch over them while a shoring crew is called."],
   ["Find a route wide enough for one runner","Carry the courier's message through the old arch","The message reaches the council before the watch changes. Darel can now call for help in the courier's name.","The passage pinches shut. You relay the message by voice from arch to arch, with no seal left to prove its origin."]]},
 "old-door":{
  leads:["the dust along the door seam","the stone tender on the night shift","the listening niche across the gallery"],
  finds:["The dust blows outward at each knock. There is moving air beyond the stone.","The oldest tender taps a shift signal; the door answers with the proper count.","A thread of air reaches the listening niche from a second seam low in the wall."],
  ends:[
   ["Write down the old shift signals","Exchange names with the knocker through the seam","An old crew signal brings back a name. Serrit can now speak for the people beyond the stone at a proper hearing.","A final answer confirms someone is alive. You leave the shift signals with the crews to keep contact open."],
   ["Gather hands and wedges at the door","Open the door far enough to help the caller","Hands meet through the gap. The crews bring the caller into the gallery before setting the wedges back.","The seam opens just wide enough for water and a lamp. The caller agrees to wait for the stone crew."],
   ["Shore the masonry around the air seam","Secure a second way to the gallery","The air seam opens onto a narrow service passage. Serrit can keep the crews safe without sealing anyone in.","The masonry holds, but there is no safe way through tonight. Serrit posts a watch beside the door."]]}
};
const LOCAL_FINAL_STATS={
 "salt-ledger":["int","cha","agi"],"low-tide-lanterns":["wis","sta","agi"],
 "vacant-lift":["int","str","dex"],"cistern-echo":["wis","str","dex"],
 "fallen-bough":["int","cha","str"],"fern-road":["wis","sta","agi"],
 branchlight:["wis","cha","dex"],"rootway-market":["int","cha","agi"],
 "silent-runner":["wis","sta","agi"],"old-door":["int","str","dex"]
};
const LEAD_STATS=["int","cha","agi"];
const validLane=lane=>Number.isInteger(lane)&&lane>=0&&lane<=2;
function genericLocalArcs(region){
 const name=clean(region?.name||"this region",80);
 return [
  {id:"waystation-appeal",title:"The Waystation Appeal",objective:"Keep a dispute at the waystation in "+name+" from turning travelers against one another.",site:"the public waystation",contact:"Mira, the local waykeeper",opening:"Two travelers arrive with conflicting accounts of a blocked road. The waykeeper will close the passage if the quarrel turns violent, and neither side is willing to leave before being heard.",beats:["Their tracks show both groups traveled the same route at different times, yet each describes an hour when the road seemed empty.","A third traveler knows why the passage was blocked but fears being blamed for the delay.","Both groups reach the narrow crossing together as the weather turns. The waykeeper needs a decision before anyone tries to force a way through."],successEnding:"You uncover what caused the delay and settle the dispute before it divides the travelers. The waykeeper keeps the passage open under a clear plan.",partialEnding:"You prevent a fight and get everyone to shelter, but the reason the road was blocked remains uncertain.",thread:"What first caused the passage to close?"},
  {id:"marked-passage",title:"The Marked Passage",objective:"Learn who has been changing the public route markers in "+name+".",site:"a public route-marker post",contact:"Orin, a local path warden",opening:"Travelers keep arriving by the wrong road after familiar route markers are turned aside. Orin has restored each marker, but someone changes them again before the next watch.",beats:["The turned markers point toward different roads, but each detour passes the same empty stretch of ground.","A nearby resident admits hearing someone at the markers after dark and has kept quiet to avoid losing access to the road.","The next marker has been loosened just before a group of travelers arrives. Orin is ready to stop the road, while the travelers press on."],successEnding:"You find who has been altering the route and give Orin enough to keep travelers on the safe road.",partialEnding:"You restore the markers and guide the travelers through, but whoever changed them is still nearby.",thread:"Why was someone redirecting travelers through the same stretch of road?"}
 ];
}
function validLocalState(value){
 const ids=Object.values(LOCAL_ARCS).flat().map(arc=>arc.id);
 return object(value)&&typeof value.arcId==="string"&&(value.arcId==="continuation"||ids.includes(value.arcId)||GENERIC_LOCAL_ARC_IDS.includes(value.arcId))&&Number.isInteger(value.progress)&&value.progress>=0&&value.progress<=LOCAL_TURNS&&Number.isInteger(value.successes)&&value.successes>=0&&value.successes<=LOCAL_TURNS&&Number.isInteger(value.setbacks)&&value.setbacks>=0&&value.setbacks<=LOCAL_TURNS&&(value.detours===undefined||value.detours===1)&&value.progress===value.successes+value.setbacks+(value.detours||0)
  &&(value.edges===undefined||Number.isInteger(value.edges)&&value.edges>=0&&value.edges<=7)
  &&(value.lastLane===undefined||value.lastLane===-1||validLane(value.lastLane))
  &&(value.lastWon===undefined||typeof value.lastWon==="boolean")
  &&(value.favor===undefined||validLane(value.favor));
}
const STAT_NAMES={str:"Strength",sta:"Stamina",dex:"Dexterity",agi:"Agility",int:"Intelligence",wis:"Wisdom",cha:"Charisma"};
const STORAGE_KEY="soa-mnm-ai-access-code";
const object=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
const clean=(value,max=1800)=>String(value??"").replace(/[<>]/g,"").replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
const regions=()=>window.soaMnmAdventure?.regions||[];

function randomSeed(){
 try{const bytes=new Uint32Array(2);crypto.getRandomValues(bytes);return Array.from(bytes,x=>x.toString(36)).join("-")}
 catch{return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,12)}
}
function createCampaign(profile){
 const start=profile?.startingLocation||window.soaMnmRules?.startLocationForRace?.(profile?.raceId)||"night-harbor";
 return {version:VERSION,characterId:String(profile?.id||""),mode:"ai",status:"idle",seed:randomSeed(),chapter:1,chapterTitle:"",turn:0,locationId:regions().some(x=>x.id===start)?start:"night-harbor",objective:"",summary:"",scene:null,history:[],chapters:[],threads:[],pending:null,lastCombatSignature:"",updatedAt:new Date().toISOString()};
}
function validScene(value,status,locationId){
 if(!object(value)||typeof value.title!=="string"||value.title.trim().length<3||value.title.length>90||typeof value.narration!=="string"||value.narration.trim().length<80||value.narration.length>1800||typeof value.objective!=="string"||value.objective.length>200||value.locationId!==locationId||!Array.isArray(value.choices)||value.choices.length>(status==="active"?3:0))return false;
 if(status==="active"&&value.choices.length!==3||status==="chapter-complete"&&value.choices.length!==0)return false;
 return value.choices.every((choice,index)=>object(choice)&&choice.id==="choice-"+(index+1)&&typeof choice.text==="string"&&choice.text.trim().length>=8&&choice.text.length<=150&&STATS.includes(choice.stat)&&Object.prototype.hasOwnProperty.call(DIFFICULTY_DC,choice.difficulty)&&choice.dc===DIFFICULTY_DC[choice.difficulty]);
}
function validHistoryRow(row){
 return object(row)&&Number.isInteger(row.chapter)&&row.chapter>=1&&row.chapter<=1000&&typeof row.title==="string"&&row.title.length<=90&&typeof row.action==="string"&&row.action.length<=180&&typeof row.result==="string"&&row.result.length<=180&&typeof row.summary==="string"&&row.summary.length<=300;
}
function validChapter(row){
 return object(row)&&Number.isInteger(row.chapter)&&row.chapter>=1&&row.chapter<=1000&&["complete","paused"].includes(row.status)&&typeof row.title==="string"&&row.title.length<=90&&typeof row.locationId==="string"&&regions().some(region=>region.id===row.locationId)&&typeof row.summary==="string"&&row.summary.length<=500&&Array.isArray(row.decisions)&&row.decisions.length<=10&&row.decisions.every(item=>typeof item==="string"&&item.length<=280);
}
const storyHeritages=["human","gnome","deep_gnome","goblin","halfling"];
const humanMethods={str:"apply leverage",sta:"outlast the obstacle",dex:"work with a careful hand",agi:"act before the opening closes",int:"plan another way",wis:"read the situation",cha:"enlist help"};
const d20Value=n=>Number.isInteger(n)&&n>=1&&n<=20;
const featureName=id=>window.soaMnmRules?.racialAbilities?.[id]?.name||"Heritage";
const spentHeritage=c=>c.heritage?.chapter===c.chapter;
function validPending(value,campaign){
 const maxTurn=campaign.mode==="local"?LOCAL_TURNS:MAX_TURNS;
 return value===null||object(value)&&Number.isInteger(value.turn)&&value.turn===campaign.turn+1&&value.turn>=1&&value.turn<=maxTurn&&object(value.action)&&typeof value.action.text==="string"&&value.action.text.length>=8&&value.action.text.length<=180&&STATS.includes(value.action.stat)&&Object.prototype.hasOwnProperty.call(DIFFICULTY_DC,value.action.difficulty)
  &&(value.action.heritage===undefined||spentHeritage(campaign)&&value.action.heritage===campaign.heritage.race)
  &&(value.action.heritage==="deep_gnome"?value.roll===null&&value.turn<MIN_CHAPTER_TURNS:d20Value(value.roll));
}
function validCampaign(value,profile){
 if(!object(value)||value.version!==VERSION||value.characterId!==String(profile?.id||"")||!["idle","active","chapter-complete"].includes(value.status)||typeof value.seed!=="string"||value.seed.length<1||value.seed.length>64||!Number.isInteger(value.chapter)||value.chapter<1||value.chapter>1000||typeof value.chapterTitle!=="string"||value.chapterTitle.length>90||!Number.isInteger(value.turn)||value.turn<0||value.turn>MAX_TURNS||!regions().some(x=>x.id===value.locationId)||typeof value.objective!=="string"||value.objective.length>200||typeof value.summary!=="string"||value.summary.length>600||!Array.isArray(value.history)||value.history.length>MAX_HISTORY||!value.history.every(validHistoryRow)||!Array.isArray(value.chapters)||value.chapters.length>40||!value.chapters.every(validChapter)||!Array.isArray(value.threads)||value.threads.length>6||value.threads.some(item=>typeof item!=="string"||item.length>150)||typeof value.lastCombatSignature!=="string"||value.lastCombatSignature.length>2000||!validPending(value.pending,value)||!((value.status==="idle"&&value.scene===null&&value.pending===null)||(value.status!=="idle"&&validScene(value.scene,value.status,value.locationId))))return false;
 const mode=value.mode||"ai";
 if(value.heritage!==undefined){const h=value.heritage;if(!object(h)||!Number.isInteger(h.chapter)||h.chapter<1||h.chapter>value.chapter||!storyHeritages.includes(h.race)||h.race!==profile.raceId||h.peek!==undefined&&(h.race!=="goblin"||!d20Value(h.peek)))return false}
 if(!["ai","local"].includes(mode))return false;
 if(mode==="local"&&(!validLocalState(value.localState)||value.turn>LOCAL_TURNS))return false;
 if(mode==="ai"&&value.localState!==undefined&&value.localState!==null)return false;
 return true;
}
function migrateCampaign(value,profile){
 if(value===null||value===undefined)return null;
 if(value.version===VERSION)return validCampaign(value,profile)?value:null;
 if(!object(value)||value.version!==1||value.characterId!==String(profile?.id||"")||!["idle","active","chapter-complete"].includes(value.status)||typeof value.seed!=="string"||!Number.isInteger(value.chapter)||value.chapter<1||!Number.isInteger(value.turn)||value.turn<0||value.turn>8||!regions().some(x=>x.id===value.locationId)||!Array.isArray(value.history))return null;
 const history=value.history.filter(validHistoryRow).slice(-MAX_HISTORY);
 const migrated={...value,version:VERSION,chapterTitle:clean(value.chapterTitle||value.scene?.title||"A continuing story",90),chapters:[],threads:[],pending:null,lastCombatSignature:"",history,updatedAt:new Date().toISOString()};
 return validCampaign(migrated,profile)?migrated:null;
}
function resolveChoice(choice,scores,roll){
 if(choice.heritage==="deep_gnome"&&roll===null)return {detour:true,roll:null,stat:choice.stat,success:false};
 const die=Math.trunc(Number(roll)),score=Number(scores?.[choice?.stat]);
 if(!STATS.includes(choice?.stat)||!Object.prototype.hasOwnProperty.call(DIFFICULTY_DC,choice?.difficulty)||!Number.isInteger(die)||die<1||die>20||!Number.isFinite(score))throw new Error("Invalid custom story check.");
 const modifier=Math.floor((score-10)/2),dc=DIFFICULTY_DC[choice.difficulty],total=die+modifier;
 return {roll:die,stat:choice.stat,modifier,total,dc,success:die===20||die!==1&&total>=dc,critical:die===20};
}
function localArcFor(campaign,region){
 const local=campaign.localState||{};
 if(local.arcId==="continuation"){
  const objective=clean(campaign.objective||"Follow the unresolved lead",200);
  return {id:"continuation",title:campaign.chapterTitle||"A Continuing Lead",objective,site:"the streets and workrooms of "+region.name,contact:"a local witness who knows the ground",opening:"Your current lead remains open, and the people closest to it are waiting to see what you do next.",beats:["Your choice changes who is willing to speak, and a practical detail from the last scene points toward the next step.","A second account contradicts the first, but both point toward the same place. The situation will not wait for perfect certainty.","The people involved are close enough to hear one another. Your next move will decide whether the matter is settled openly or left for another day."],successEnding:"You turn the lead into a clear outcome and leave the people involved with a safer way forward.",partialEnding:"You contain the immediate trouble, but one important question remains unanswered.",thread:"Unresolved lead: "+objective};
 }
 for(const arc of Object.values(LOCAL_ARCS).flat())if(arc.id===local.arcId)return arc;
 const generic=genericLocalArcs(region).find(arc=>arc.id===local.arcId);if(generic)return generic;
 return selectLocalArc(region.id,campaign.seed,campaign.chapter,"");
}
function seedIndex(seed,length){
 let hash=2166136261;
 for(const char of String(seed||""))hash=Math.imul(hash^char.charCodeAt(0),16777619);
 return (hash>>>0)%length;
}
function selectLocalArc(regionId,seed,chapter,excludeId){
 const region=regions().find(item=>item.id===regionId)||{id:regionId,name:regionId};
 const pool=LOCAL_ARCS[regionId]||genericLocalArcs(region);
 let index=seedIndex(String(seed)+":"+chapter,pool.length);
 if(pool.length>1&&pool[index].id===excludeId)index=(index+1)%pool.length;
 return pool[index];
}
function regionalChoices(arc,beat,state){
 const route=LOCAL_ROUTES[arc.id],{leads,ends}=route;
 const opening=["Examine "+leads[0],"Get the story from "+leads[1],"Scout "+leads[2]];
 const follow=["Preserve the marks on "+leads[0],"Bring "+leads[1]+" forward as a witness","Mark a safe route along "+leads[2]];
 const recover=["Reconstruct what was disturbed at "+leads[0],"Offer "+leads[1]+" a private hearing","Find another way past "+leads[2]];
 return leads.map((_,lane)=>{
  const repeated=lane===state.lastLane,edge=Boolean((state.edges||0)&(1<<lane));
  const text=beat===0?opening[lane]:beat===1?(repeated?(state.lastWon?follow:recover)[lane]:opening[lane]):ends[lane][beat===2?0:1];
  const difficulty=beat===0?(state.favor===lane?"easy":"standard"):
   beat===1?(repeated&&state.lastWon?"easy":"standard"):
   beat===2?(edge?"easy":"standard"):
   repeated&&state.lastWon?"easy":edge?"standard":"hard";
  const stat=beat>=2?LOCAL_FINAL_STATS[arc.id][lane]:LEAD_STATS[lane];
  const advantage=beat===0&&state.favor===lane?"A local favor":beat===1&&repeated&&state.lastWon?"Following your lead":beat===3&&repeated&&state.lastWon?"Your prepared plan":beat>=2&&edge?"Earlier groundwork":"";
  return {id:"choice-"+(lane+1),lane,text,stat,difficulty,dc:DIFFICULTY_DC[difficulty],advantage};
 });
}
function localChoices(arc,beat,state){
 if(LOCAL_ROUTES[arc.id])return regionalChoices(arc,beat,state);
 const sets=[
  [
   ["Inspect "+arc.site+" for signs of a changed account or hidden route.","int","standard"],
   ["Ask "+arc.contact+" what the official story leaves out.","cha","easy"],
   ["Scout the nearby passage before the next watch changes.","agi","hard"]
  ],
  [
   ["Compare the witness accounts against the detail you found.","wis","standard"],
   ["Invite someone overlooked to speak with you privately.","cha","standard"],
   ["Follow the less-traveled route around "+arc.site+".","agi","hard"]
  ],
  [
   ["Present the evidence and ask for a direct explanation.","int","hard"],
   ["Bring the people involved together before rumor spreads.","cha","standard"],
   ["Put yourself between the vulnerable and the danger.","str","hard"]
  ],
  [
   ["Settle the matter through a careful public account.","cha","standard"],
   ["Take the dangerous route and secure the truth firsthand.","agi","hard"],
   ["Stand firm and demand that the immediate threat end.","str","hard"]
  ]
 ];
 return sets[Math.min(3,beat)].map((row,index)=>({id:"choice-"+(index+1),text:row[0],stat:row[1],difficulty:row[2],dc:DIFFICULTY_DC[row[2]]}));
}
function localScene(campaign,region,arc,progress,lastOutcome,introduction=""){
 const stages=["The first trace","Gather your allies","The turning point"];
 let narration=progress===0?introduction+arc.opening:lastOutcome.detour?lastOutcome.summary:lastOutcome.summary+" "+arc.beats[progress-1];
 if(progress===2&&LOCAL_ROUTES[arc.id])narration+=" There is time to prepare for one course of action.";
 return {title:clean(progress===0?arc.title:arc.title+" · "+stages[progress-1],90),narration:clean(narration,1800),objective:campaign.objective||arc.objective,locationId:region.id,choices:localChoices(arc,progress,campaign.localState)};
}
function localEnding(campaign,region,arc,state,settlement){
 if(settlement){
  const solved=state.lastWon,summary=clean(settlement,500),thread=clean(arc.thread,150);
  return {summary,scene:{title:clean(campaign.chapterTitle+" · Outcome",90),narration:clean(summary+" "+(solved?"By the change of watch, word of your part in it has reached "+arc.site+".":"At the change of watch, "+arc.contact+" keeps a place for the unfinished business."),1800),objective:solved?"Your chosen course is settled.":"The watch ends with unfinished business.",locationId:region.id,choices:[]},thread,solved};
 }
 const solved=state.lastWon??(state.successes>=2),summary=solved?arc.successEnding:arc.partialEnding;
 const narration=solved
  ?"The pressure lifts from "+region.name+". "+summary+" The people you helped will remember how you handled the matter."
  :"The immediate danger passes in "+region.name+", though the full truth remains out of reach. "+summary+" The unresolved lead is recorded in your journal.";
 return {summary:clean(summary,500),scene:{title:clean(campaign.chapterTitle+" · Outcome",90),narration:clean(narration,1800),objective:solved?"The immediate objective is resolved.":"The immediate danger is contained; an open lead remains.",locationId:region.id,choices:[]},thread:clean(arc.thread,150),solved};
}
function startLocalChapter(profile,save,panel,status,onChange){
 const original=save.aiCampaign,region=currentRegion(save);
 if(!region){status.textContent="Choose a known region before beginning a local chapter.";return}
 if(original.pending){status.textContent="Resolve the saved action first, or continue it locally with the same roll.";return}
 if(original.status==="active"&&original.locationId===region.id){status.textContent="Finish the current chapter before starting another.";return}
 const leftActive=original.status==="active"&&original.locationId!==region.id;
 const chapter=original.status==="chapter-complete"||leftActive?original.chapter+1:original.chapter;
 const archived=leftActive?[...original.chapters,chapterRecord(original,"paused","This lead remains open: "+original.objective+" "+original.summary,original.history)].slice(-40):original.chapters;
 const threads=leftActive?["Unresolved lead: "+clean(original.objective,100),...original.threads].slice(0,6):original.threads;
 const arc=selectLocalArc(region.id,randomSeed(),chapter,original.localState?.arcId||"");
 const localState={arcId:arc.id,progress:0,successes:0,setbacks:0};
 let introduction="";
 if(original.status==="chapter-complete"&&original.locationId===region.id&&original.mode==="local"&&original.localState?.lastWon&&validLane(original.localState.lastLane)&&LOCAL_ROUTES[arc.id]){
  const oldArc=localArcFor(original,region),lane=original.localState.lastLane,leads=LOCAL_ROUTES[arc.id].leads;
  const favor=["points out a detail on "+leads[0],"arranges a meeting with "+leads[1],"draws you a way in by "+leads[2]][lane];
  localState.favor=lane;
  introduction=oldArc.contact.split(",")[0]+" remembers your help and "+favor+". ";
 }
 const next={...original,mode:"local",localState,version:VERSION,status:"active",seed:randomSeed(),chapterTitle:arc.title,chapter,turn:0,locationId:region.id,objective:arc.objective,summary:arc.opening,scene:null,chapters:archived,threads,pending:null,lastCombatSignature:original.lastCombatSignature,updatedAt:new Date().toISOString()};
 next.scene=localScene(next,region,arc,0,null,introduction);
 if(!commitCampaign(save,next,onChange,{render:true,message:"",focusScene:true}))status.textContent="The local campaign could not be saved; your previous story is intact.";
}
function continueLocally(profile,save,panel,status,onChange){
 const original=save.aiCampaign,region=currentRegion(save);
 if(!region||original.locationId!==region.id){status.textContent="Return to the scene's region before continuing locally.";return}
 if(original.mode==="local"){status.textContent="This campaign already resolves locally.";return}
 const next={...original,mode:"local",localState:{arcId:"continuation",progress:0,successes:0,setbacks:0},turn:0,pending:null,updatedAt:new Date().toISOString()};
 if(original.pending)next.pending={...original.pending,turn:1};
 if(!commitCampaign(save,next,onChange,{render:!next.pending,message:"Local play is ready. Existing story choices and saved history remain in place."})){status.textContent="Local play could not be saved; the prior campaign remains intact.";return}
 if(next.pending)resolveLocalPending(profile,save,panel,status,onChange);
}
function localOutcomeSummary(resolution,arc){
 const name=arc.contact.split(",")[0],support={
  str:"Your effort clears the way for the people who could not get through on their own.",
  sta:"You hold out long enough for the others to catch up. Nobody has to go on alone.",
  agi:"You get into position before anyone sees you move.",
  dex:"A steady hand makes the difference; the work is done before anyone calls attention to it.",
  wis:"A small detail gives away what the first account missed. You know where to look next.",
  int:"You fit two pieces of the account together. The discrepancy gives you something to follow.",
  cha:"A hesitant listener steps forward. You have someone willing to speak for your account."
 };
 return resolution.success?support[resolution.stat]:"The watch changes before your plan comes together. At "+arc.site+", "+name+" still has a way to move the inquiry forward.";
}
function regionalOutcome(arc,previous,lane,won){
 const route=LOCAL_ROUTES[arc.id],beat=previous.progress,name=arc.contact.split(",")[0];
 if(beat===3)return route.ends[lane][won?2:3];
 if(beat===2)return won?name+" watches your preparations, then steps in beside you. “If you go through with it, I'll be right here.”":
  name+" calls time before the preparations are finished. You can still go through with the plan, or commit to another.";
 if(beat===1&&previous.lastLane===lane){
  if(won)return [
   "You piece together a record that someone else could check. "+name+" agrees to keep it safe.",
   "This time the account comes with a name. You have a witness willing to stand beside you.",
   name+" follows your marks through the turning without a word of guidance. You can get back here in a hurry."
  ][lane];
  return [
   "The marks are too far gone to prove what happened. "+name+" tells you where to look for a second account.",
   "The witness draws away as footsteps approach. You'll have to proceed without their word in public.",
   "The footing gives before you can mark the crossing. You get back safely, but cannot count on a quick way through."
  ][lane];
 }
 if(won)return route.finds[lane];
 return [
  "A second pair of hands has disturbed the marks. You can try to reconstruct them, but there is nothing yet to show "+name+".",
  "Someone is listening. You get a warning glance and no answer; a private hearing might still open the way.",
  "The way narrows out of sight of "+name+". You turn back before you lose your bearings; another approach might still get through."
 ][lane];
}
function resolveLocalPending(profile,save,panel,status,onChange){
 const campaign=save.aiCampaign,pending=campaign.pending,region=currentRegion(save);
 if(!pending||campaign.mode!=="local"){status.textContent="There is no saved local action waiting to resolve.";return}
 if(!region||campaign.locationId!==region.id){status.textContent="Return to the scene's region before resolving this saved action.";return}
 const resolution=resolveChoice(pending.action,profile.stats,pending.roll),arc=localArcFor(campaign,region),progress=campaign.localState.progress+1;
 // Match the saved decision, including its check. Free actions and older, already
 // displayed scenes must not silently acquire a different authored intention.
 const offered=campaign.scene.choices.find(c=>c.text===pending.action.text&&c.stat===(pending.action.sourceStat||pending.action.stat)&&c.difficulty===pending.action.difficulty);
 const lane=LOCAL_ROUTES[arc.id]&&validLane(offered?.lane)?offered.lane:-1;
 const outcomeSummary=resolution.detour?"You mark a way around the obstruction and come out beside "+arc.site+". You leave the immediate question unanswered, but now you know how to approach the ground ahead.":lane===-1?localOutcomeSummary(resolution,arc):regionalOutcome(arc,campaign.localState,lane,resolution.success);
 const entry=historyEntry(campaign,campaign.scene,pending.action,{summary:outcomeSummary},resolution),history=[...campaign.history,entry].slice(-MAX_HISTORY);
 const edges=(campaign.localState.edges||0)|(progress<=2&&lane>=0&&resolution.success?1<<lane:0);
 const localState={...campaign.localState,progress,edges,lastLane:lane,lastWon:resolution.success,successes:campaign.localState.successes+(resolution.success?1:0),setbacks:campaign.localState.setbacks+(resolution.success||resolution.detour?0:1),...(resolution.detour?{detours:1}:{})};
 let statusValue="active",summary=outcomeSummary,scene,chapters=campaign.chapters,threads=campaign.threads;
 if(progress>=LOCAL_TURNS){
  const ending=localEnding(campaign,region,arc,localState,lane>=0?outcomeSummary:null);
  summary=ending.summary;scene=ending.scene;statusValue="chapter-complete";
  chapters=[...chapters,chapterRecord({...campaign,chapterTitle:campaign.chapterTitle||scene.title},"complete",summary,history)].slice(-40);
  threads=ending.solved?threads:[ending.thread,...threads.filter(t=>t!==ending.thread)].slice(0,6);
 }else scene=localScene({...campaign,localState},region,arc,progress,{success:resolution.success,detour:resolution.detour,summary:outcomeSummary});
 if(resolution.detour)mapApproaches(scene);
 const next={...campaign,mode:"local",localState,status:statusValue,turn:pending.turn,summary,scene,history,chapters,threads,pending:null,updatedAt:new Date().toISOString()};
 const previousJournal=save.journal,previousUpdatedAt=save.updatedAt;
 save.journal=[...save.journal,"Local campaign · Chapter "+campaign.chapter+", scene "+pending.turn+": "+entry.action+" — "+entry.result+" — "+entry.summary].slice(-100);
 save.updatedAt=new Date().toISOString();
 if(!commitCampaign(save,next,onChange,{render:true,message:"",focusScene:true})){
  save.journal=previousJournal;save.updatedAt=previousUpdatedAt;status.textContent="The local turn could not be saved. Your exact die roll remains available.";
 }
}

function element(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node}
function getCode(){try{return sessionStorage.getItem(STORAGE_KEY)||""}catch{return ""}}
function setCode(value){try{sessionStorage.setItem(STORAGE_KEY,value)}catch{}}
function currentRegion(save){return regions().find(x=>x.id===save.currentLocation)||regions().find(x=>x.id==="night-harbor")}
function sameActiveCharacter(id){return String(window.soaCharacters?.profile?.()?.id||"")===String(id)}
async function apiRequest(code,payload){
 const response=await fetch("/api/mnm-chronicle",{method:payload?"POST":"GET",cache:"no-store",headers:{"X-Story-Access":code,...(payload?{"Content-Type":"application/json"}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
 const data=await response.json().catch(()=>({error:"Unexpected response from the Story Director."}));
 if(!response.ok)throw new Error(data.error||"Story Director returned "+response.status+".");
 return data;
}
function sceneFromResponse(data,locationId){
 const scene={title:clean(data.title,90),narration:clean(data.narration,1800),objective:clean(data.objective,200),locationId,choices:Array.isArray(data.choices)?data.choices.map((choice,index)=>({id:"choice-"+(index+1),text:clean(choice.text,150),stat:choice.stat,difficulty:choice.difficulty,dc:Number(choice.dc)})):[]};
 if(!validScene(scene,data.chapterComplete?"chapter-complete":"active",locationId))throw new Error("The Story Director returned an incomplete scene. Your saved action and roll are unchanged.");
 return scene;
}
function contextCharacter(profile,lastCombatSignature=""){
 const loaded=window.soaMnmSystems?.read?.(profile),system=loaded?.ok?loaded.save:null,rpg=system?.rpg;
 const learned=new Set([...(system?.learnedAbilities||[]),...(system?.memorizedAbilities||[]).filter(Boolean)]);
 const abilities=system?.abilityBook?Object.values(system.abilityBook).flat().filter(record=>record?.source==="official"&&record.classId===profile.classId&&learned.has(record.id)).map(record=>clean(record.name,100)).slice(0,16):[];
 const log=Array.isArray(rpg?.log)?rpg.log.slice(0,30):[],startIndex=log.findIndex(line=>String(line).startsWith("Encounter started:")),resultIndex=startIndex>=0?log.slice(0,startIndex).findIndex(line=>/^(?:Victory over |Defeated by |You were defeated\.|You escape from )/.test(String(line))):-1;
 const recentCombat=resultIndex>=0?log.slice(resultIndex,startIndex+1).reverse().slice(-10).map(line=>clean(line,220)):[];
 const combatSignature=recentCombat.length?String(system?.rpg?.encounterSerial||0)+":"+recentCombat.join(" | ").slice(0,1700):lastCombatSignature;
 return {character:{id:String(profile.id),name:clean(profile.name,36),raceId:profile.raceId,classId:profile.classId,level:Number(system?.level||profile.level)||1,stats:Object.fromEntries(STATS.map(key=>[key,Math.trunc(Number(profile.stats?.[key])||10)])),health:rpg?{current:Number(rpg.hp)||0,max:Number(rpg.maxHp)||0}:null,focus:rpg?{current:Number(rpg.focus)||0,max:Number(rpg.maxFocus)||0}:null,knownAbilities:abilities},recentCombat:combatSignature&&combatSignature!==lastCombatSignature?recentCombat:[],combatSignature:combatSignature||lastCombatSignature};
}
function historyEntry(campaign,scene,action,result,roll){
 const check=roll.detour?"Safe passage · no roll":(action.heritage==="gnome"?"fixed ":action.heritage==="halfling"?"remembered ": "d20 ")+roll.roll+(roll.modifier>=0?" + ":" - ")+Math.abs(roll.modifier)+" = "+roll.total+" vs DC "+roll.dc+" · "+(roll.success?"success":"failure");
 const approach=action.heritage==="human"?humanMethods[action.stat]+": ":"";
 return {chapter:campaign.chapter,title:scene.title,action:clean(approach+action.text,180),result:(action.heritage?featureName(action.heritage)+" · ":"")+check,summary:clean(result.summary,300),...(d20Value(roll.roll)?{die:roll.roll,success:roll.success}:{})};
}
function mapApproaches(scene){
 for(const c of scene.choices){const tier={hard:"standard",standard:"easy",easy:"easy"}[c.difficulty];if(tier!==c.difficulty){c.difficulty=tier;c.dc=DIFFICULTY_DC[tier];c.advantage="Mapped approach"}}
}
function rememberedRolls(campaign){
 // Pre-heritage journals stored the roll only as display text.
 return campaign.history.filter(h=>h.chapter===campaign.chapter).map(h=>{const old=/^d20 (\d+) .* · success$/.exec(h.result);return {action:h.action,die:h.success?h.die:old?Number(old[1]):null}}).filter(h=>d20Value(h.die));
}
function makePayload(kind,profile,campaign,regionId,chapter,turn,extra={}){
 const chapters=campaign.chapters.slice(-8).map(row=>({chapter:row.chapter,status:row.status,title:row.title,locationId:row.locationId,summary:row.summary,decisions:row.decisions.slice(-5)})),characterState=contextCharacter(profile,campaign.lastCombatSignature);
 return {kind,character:characterState.character,recentCombat:characterState.recentCombat,combatSignature:characterState.combatSignature,regionId,chapter,turn,seed:campaign.seed,objective:campaign.objective,previousSummary:campaign.summary,chapters,threads:campaign.threads,history:campaign.history.slice(-12),...extra};
}
function chapterRecord(campaign,status,summary,history){
 const decisions=history.filter(row=>row.chapter===campaign.chapter).slice(-10).map(row=>clean(row.action+" — "+row.result+" — "+row.summary,280));
 return {chapter:campaign.chapter,status,title:campaign.chapterTitle||campaign.scene?.title||"Untitled chapter",locationId:campaign.locationId,summary:clean(summary,500),decisions};
}
function setBusy(panel,busy,message){
 const status=panel.querySelector("[data-ai-status]");if(status&&message)status.textContent=message;
 panel.setAttribute("aria-busy",String(busy));panel.querySelectorAll("button,textarea,select").forEach(control=>{if(control.dataset.aiConnection!=="true")control.disabled=busy});
}
function commitCampaign(save,next,onChange,options={}){
 const previous=save.aiCampaign;save.aiCampaign=next;
 if(onChange?.(options)!==false)return true;
 save.aiCampaign=previous;return false;
}
async function startChapter(profile,save,panel,status,onChange,code){
 if(!code){status.textContent="Enter the AI access code configured in Cloudflare first.";return}
 if(save.aiCampaign.pending){status.textContent="Resolve or retry your saved action before starting another chapter.";return}
 setCode(code);
 const original=save.aiCampaign,region=currentRegion(save);
 if(!region){status.textContent="Choose a known starting region before beginning.";return}
 const leftActiveChapter=original.status==="active"&&original.locationId!==region.id;
 const chapter=original.status==="chapter-complete"||leftActiveChapter?original.chapter+1:original.chapter;
 const archived=leftActiveChapter?[...original.chapters,chapterRecord(original,"paused","This lead remains unresolved: "+original.objective+" "+original.summary,original.history)].slice(-40):original.chapters;
 const carriedThreads=leftActiveChapter?["Unresolved lead: "+clean(original.objective,100),...original.threads].slice(0,6):original.threads;
 const payloadCampaign={...original,chapters:archived,threads:carriedThreads};
 const prior=leftActiveChapter?"Unresolved objective: "+original.objective+". Last known progress: "+original.summary:original.summary;
 setBusy(panel,true,"The Story Director is shaping the next part of your campaign…");
 try{
  const payload=makePayload("opening",profile,payloadCampaign,region.id,chapter,0,{previousSummary:prior}),data=await apiRequest(code,payload);
  if(!sameActiveCharacter(profile.id)||!panel.isConnected||save.aiCampaign!==original)return;
  const scene=sceneFromResponse(data,region.id);
  const next={...original,version:VERSION,mode:"ai",status:"active",seed:randomSeed(),chapter,chapterTitle:scene.title,turn:0,locationId:region.id,objective:scene.objective,summary:clean(data.summary,600),scene,chapters:archived,threads:Array.isArray(data.threads)?data.threads.map(x=>clean(x,150)).filter(Boolean).slice(0,6):carriedThreads,pending:null,lastCombatSignature:payload.combatSignature||original.lastCombatSignature,updatedAt:new Date().toISOString()};
  delete next.localState;
  if(!commitCampaign(save,next,onChange,{render:true,message:"",focusScene:true})){status.textContent="The AI chapter could not be saved. Your previous story is intact.";return}
 }catch(error){
  if(panel.isConnected)status.textContent=error.message;
 }finally{if(panel.isConnected)setBusy(panel,false)}
}
async function resolvePending(profile,save,panel,status,onChange,code){
 const campaign=save.aiCampaign,pending=campaign.pending,region=currentRegion(save);
 if(!pending){status.textContent="There is no saved action waiting to resolve.";return}
 if(!code){status.textContent="Enter the AI access code configured in Cloudflare to retry this same roll.";return}
 if(!region||campaign.locationId!==region.id){status.textContent="Return to the scene's region before resolving this saved action.";return}
 setCode(code);
 const resolution=resolveChoice(pending.action,profile.stats,pending.roll);
 setBusy(panel,true,resolution.detour?"Your route is saved. The Story Director is charting the next scene…":"Your saved d20 result is locked. The Story Director is continuing from it…");
 try{
  const payload=makePayload("turn",profile,campaign,region.id,campaign.chapter,pending.turn,{scene:{title:campaign.scene.title,narration:campaign.scene.narration,objective:campaign.scene.objective},action:pending.action,roll:pending.roll}),data=await apiRequest(code,payload);
  if(!sameActiveCharacter(profile.id)||!panel.isConnected||save.aiCampaign!==campaign)return;
  const scene=sceneFromResponse(data,region.id),entry=historyEntry(campaign,campaign.scene,pending.action,data,resolution),complete=data.chapterComplete===true;
  if(resolution.detour){if(complete)throw new Error("The detour cannot settle this chapter.");mapApproaches(scene)}
  const history=[...campaign.history,entry].slice(-MAX_HISTORY),chapters=complete?[...campaign.chapters,chapterRecord({...campaign,chapterTitle:campaign.chapterTitle||campaign.scene.title},"complete",data.summary,history)].slice(-40):campaign.chapters;
  const next={...campaign,status:complete?"chapter-complete":"active",turn:pending.turn,locationId:region.id,objective:scene.objective,summary:clean(data.summary,600),scene,history,chapters,threads:Array.isArray(data.threads)?data.threads.map(x=>clean(x,150)).filter(Boolean).slice(0,6):campaign.threads,pending:null,lastCombatSignature:payload.combatSignature||campaign.lastCombatSignature,updatedAt:new Date().toISOString()};
  const previousJournal=save.journal,previousUpdatedAt=save.updatedAt;
  save.journal=[...save.journal,"AI Chronicle · Chapter "+campaign.chapter+", turn "+pending.turn+": "+entry.action+" — "+entry.result+" — "+entry.summary].slice(-100);
  save.updatedAt=new Date().toISOString();
  if(!commitCampaign(save,next,onChange,{render:true,message:"",focusScene:true})){
   save.journal=previousJournal;save.updatedAt=previousUpdatedAt;status.textContent="The AI turn could not be saved. Your exact die roll remains available to retry.";return;
  }
 }catch(error){
  if(panel.isConnected&&sameActiveCharacter(profile.id)&&save.aiCampaign===campaign){setBusy(panel,false);onChange?.({render:true,message:resolution.detour?"Your detour is saved. The Story Director could not continue it. Retry or continue locally.":"Your exact d20 roll is saved. "+error.message+" Retry this roll or continue locally."})}
 }finally{if(panel.isConnected)setBusy(panel,false)}
}
function chooseAction(profile,save,panel,status,onChange,code,choice,use=null){
 const campaign=save.aiCampaign,region=currentRegion(save);
 if(campaign.pending){status.textContent="Your previous action is already saved. Resolve that same roll before choosing again.";return}
 if(!region||campaign.locationId!==region.id){status.textContent="Open a fresh chapter at your current location first.";return}
 if(campaign.status!=="active")return;
 const turn=campaign.turn+1,local=campaign.mode==="local";
 if(turn>(local?LOCAL_TURNS:MAX_TURNS)){status.textContent="This chapter is ready to conclude.";return}
 const race=profile.raceId,action={text:clean(choice.text,180),stat:choice.stat,difficulty:choice.difficulty};
 let heritage=campaign.heritage,roll;
 if(use){
  if(!storyHeritages.includes(race)||race==="goblin"||spentHeritage(campaign)||race!=="deep_gnome"&&!campaign.scene.choices.includes(choice))return;
  if(race==="human"){if(!STATS.includes(use.stat)||use.stat===choice.stat)return;action.sourceStat=choice.stat;action.stat=use.stat}
  if(race==="gnome")roll=12;
  if(race==="halfling"){const deed=rememberedRolls(campaign)[use.deed];if(!deed)return;roll=deed.die;action.memory=clean(deed.action,180)}
  if(race==="deep_gnome"){if(turn>=MIN_CHAPTER_TURNS)return;roll=null}
  action.heritage=race;heritage={race,chapter:campaign.chapter};
 }else if(spentHeritage(campaign)&&heritage.race==="goblin"&&d20Value(heritage.peek)){
  roll=heritage.peek;action.heritage="goblin";heritage={race,chapter:campaign.chapter};
 }
 if(roll===undefined)roll=Math.floor(Math.random()*20)+1;
 const pending={turn,action,roll};
 if(code)setCode(code);
 const next={...campaign,pending,...(heritage?{heritage}:{}),updatedAt:new Date().toISOString()};
 if(!commitCampaign(save,next,onChange,{render:false,message:"Your decision is saved."})){status.textContent="The decision could not be saved. No use was spent.";return}
 if(local){resolveLocalPending(profile,save,panel,status,onChange);return}
 if(!code){onChange?.({render:true,message:"Your choice is saved. Continue locally or connect the Story Director.",focusScene:true});return}
 status.textContent="Your choice is saved. The Story Director is writing what follows.";
 resolvePending(profile,save,panel,status,onChange,code);
}
const ARRIVAL_NOTES=Object.freeze({
 "night-harbor":"A porter shoulders a bale past you. Beyond the awnings, a brass bell rings twice and a pilot calls for the tide. Half the quay is already moving; the other half is listening.",
 underdocks:"The lift vanishes into the rock overhead. Water ticks from its chain into the black harbor. On the landing, a crew waits with its lamps turned low.",
 penshaw:"A boat noses up to the pilings. Someone catches the painter before the hull can knock against the wood. Farther up the landing, a quiet argument breaks off as people turn to look.",
 faelindral:"A basket comes up through the leaves on a creaking rope. Above you, travelers step aside on the wooden walk to let its keeper pass.",
 "ail-vorith":"Footsteps carry a long way through the gallery. A stone tender cups a lamp against a cold draft and listens until the last echo fades."
});
function render(profile,save,onChange,navigation={}){
 const panel=element("section",undefined,"soa-mnm-adventure-panel soa-mnm-ai-chronicle");panel.setAttribute("aria-label","M&M Adventure campaign");
 const region=currentRegion(save),campaign=save.aiCampaign,isLocal=campaign?.mode==="local",savedCode=getCode();
 const button=(text,action,primary=false)=>{const b=element("button",text,"soa-mnm-system-button"+(primary?" soa-mnm-ai-primary":""));b.type="button";b.onclick=action;return b};
 const disclosure=(title,cls)=>{const d=element("details",undefined,cls);d.append(element("summary",title));return d};
 const status=element("p","","soa-mnm-live");status.dataset.aiStatus="true";status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 if(!region||!campaign||!validCampaign(campaign,profile)){panel.append(element("h2","Adventure paused"),element("p","The saved campaign or its location could not be loaded. Your story has been preserved."));return panel}
 const connection=disclosure("Story Director connection and game rules","soa-mnm-ai-connection");
 connection.append(element("p","Connect the Story Director for AI-written scenes. You can also play a complete local chapter without signing in. Both use the same dice: roll a d20 and add your stat modifier to meet the target. A natural 20 always succeeds; a natural 1 always fails."));
 const label=element("label","Story access code","soa-mnm-system-label");
 const input=element("input",undefined,"soa-mnm-system-input");input.type="password";input.id="soa-mnm-ai-code";label.htmlFor=input.id;input.autocomplete="off";input.value=savedCode;input.placeholder="Access code";input.onchange=()=>setCode(input.value.trim());label.append(input);
 const feedback=element("p","The code is kept in this tab.","soa-mnm-live");feedback.setAttribute("role","status");
 const code=()=>input.value.trim();
 let waitingForCode=null;
 const proceed=button("Continue with this code",()=>{const value=code();if(!value){input.focus();return}const next=waitingForCode;waitingForCode=null;proceed.hidden=true;next?.(value)});proceed.hidden=true;
 const withDirector=cb=>{const value=code();if(value){waitingForCode=null;proceed.hidden=true;cb(value);return}waitingForCode=cb;connection.open=true;proceed.hidden=false;feedback.textContent="Enter your story access code to continue.";input.focus()};
 input.onkeydown=event=>{if(event.key==="Enter"&&waitingForCode){event.preventDefault();proceed.click()}};
 const test=button("Check connection",()=>withDirector(async value=>{setCode(value);test.disabled=true;feedback.textContent="Contacting the Story Director…";try{const result=await apiRequest(value,null);if(panel.isConnected&&sameActiveCharacter(profile.id))feedback.textContent=result.status||"Connection ready."}catch(error){if(panel.isConnected)feedback.textContent=error.message}finally{test.disabled=false}}));test.dataset.aiConnection="true";
 connection.append(label,proceed,test,feedback);
 const localButton=(text,primary=true)=>button(text,()=>startLocalChapter(profile,save,panel,status,onChange),primary);
 const directorButton=(text,primary=false)=>button(text,()=>withDirector(value=>startChapter(profile,save,panel,status,onChange,value)),primary);
 const leadButtons=(localText,aiText)=>{
  if(savedCode&&!isLocal)panel.append(directorButton(aiText,true),localButton(localText,false));
  else panel.append(localButton(localText),directorButton(aiText));
 };
 if(campaign.status==="idle"){
  panel.append(element("div",region.name+" · "+(region.zone||"Aêthoril"),"soa-mnm-kicker"),element("h2","Arrival in "+region.name),element("p",ARRIVAL_NOTES[region.id]||"A few travelers linger where the road reaches "+region.name+". Someone here has a story to tell.","soa-mnm-ai-narrative"),status);
  leadButtons("Follow a local lead","Begin an AI-written adventure");
  panel.append(connection);return panel;
 }
 const currentMatches=campaign.locationId===region.id,sceneRegion=regions().find(x=>x.id===campaign.locationId)?.name||"another region",complete=campaign.status==="chapter-complete";
 const displayTitle=campaign.scene.title||campaign.chapterTitle,sceneNo=campaign.turn+1;
 panel.append(element("div",sceneRegion+" · Chapter "+campaign.chapter+(complete?" · Complete":isLocal?" · Scene "+sceneNo+" of "+LOCAL_TURNS:" · Scene "+sceneNo),"soa-mnm-kicker"),element("h2",displayTitle),element("p",campaign.scene.narration,"soa-mnm-ai-narrative"),status);
 if(!complete&&campaign.objective)panel.append(element("p","Your aim: "+campaign.objective,"soa-mnm-feature-status"));
 const latest=campaign.history.filter(row=>row.chapter===campaign.chapter).slice(-1)[0];
 if(latest){const roll=disclosure("Last action: "+latest.result,"soa-mnm-roll-receipt");roll.append(element("p",latest.action));panel.append(roll)}
 const systems=window.soaMnmSystems,sys=systems?.read?.(profile);
 const rewardButton=(chapter,caption)=>button(caption,()=>{const result=systems?.claimStoryReward?.(profile,"ai-chapter-"+chapter,90);if(!result?.ok){status.textContent=result?.error||"The reward could not be saved.";return}onChange?.({render:true,message:result.result.alreadyClaimed?"You already claimed this chapter reward.":"Chapter "+chapter+": "+result.result.xp+" XP claimed."})});
 const claimed=chapter=>sys?.ok&&sys.save.rpg.claimedStories.includes("ai-chapter-"+chapter);
 if(!currentMatches&&campaign.pending){
  panel.append(element("p","Your saved action is waiting in "+sceneRegion+". Return there to see what happens."));if(navigation.onOpenWorld)panel.append(button("Find the route to "+sceneRegion,navigation.onOpenWorld,true));
 }else if(!currentMatches){
  panel.append(element("p",complete?"You are now in "+region.name+". Pick up your next lead here.":"You are now in "+region.name+". Starting a chapter here leaves your old lead in the journal. You can also travel back to finish it."));
  leadButtons("Follow a lead in "+region.name,"Begin an AI chapter here");if(!complete&&navigation.onOpenWorld)panel.append(button("Find the route back to "+sceneRegion,navigation.onOpenWorld));
 }else if(complete){
  panel.append(element("h3","Where next?","soa-mnm-decision-heading"));
  leadButtons("Follow another local lead","Continue with the Story Director");
  if(navigation.onOpenWorld)panel.append(button("Take the road",navigation.onOpenWorld));
 }else if(campaign.pending){
  const p=campaign.pending,outcome=resolveChoice(p.action,profile.stats,p.roll);
  panel.append(element("h3","Your move is recorded","soa-mnm-decision-heading"),element("p",p.action.text),element("p",historyEntry(campaign,campaign.scene,p.action,{},outcome).result,"soa-mnm-feature-status"));
  if(isLocal)panel.append(button("Reveal the outcome",()=>resolveLocalPending(profile,save,panel,status,onChange),true));
  else{
   const local=button("Continue this action locally",()=>continueLocally(profile,save,panel,status,onChange),!savedCode),remote=button("Resolve with the Story Director",()=>withDirector(value=>resolvePending(profile,save,panel,status,onChange,value)),!!savedCode);
   panel.append(...(savedCode?[remote,local]:[local,remote]));
  }
 }else{
  panel.append(element("h3","What do you do?","soa-mnm-decision-heading"));
  const signed=n=>n<0?"−"+Math.abs(n):"+"+n,mod=stat=>Math.floor((Number(profile.stats?.[stat]??10)-10)/2);
  const race=profile.raceId,feature=window.soaMnmRules?.racialAbilities?.[race];
  const peek=spentHeritage(campaign)?campaign.heritage.peek:undefined;
  if(d20Value(peek))panel.append(element("p",featureName(race)+" · Your next die is "+peek+". Choose which approach to take; this die stays fixed.","soa-mnm-feature-status"));
  const grid=element("div",undefined,"soa-mnm-choice-grid");
  campaign.scene.choices.forEach(choice=>{const b=element("button",undefined,"soa-mnm-choice soa-mnm-ai-choice");b.type="button";b.append(element("strong",choice.text),element("span",STAT_NAMES[choice.stat]+" "+signed(mod(choice.stat))+" · DC "+choice.dc+(choice.advantage?" · "+choice.advantage:"")));b.onclick=()=>chooseAction(profile,save,panel,status,onChange,code(),choice);grid.append(b)});panel.append(grid);
  if(feature&&storyHeritages.includes(race)){
   const used=spentHeritage(campaign),trait=disclosure(feature.name+(used?" · Used this chapter":" · Heritage action"),"soa-mnm-ai-custom-disclosure");
   trait.append(element("p",feature.effect));
   const play=(choice,use)=>chooseAction(profile,save,panel,status,onChange,code(),choice,use);
   if(!used&&race==="goblin"){
    trait.append(button("Read the opening · reveal your die",()=>{
     if(save.aiCampaign!==campaign||campaign.pending||spentHeritage(campaign))return;
     const next={...campaign,heritage:{chapter:campaign.chapter,race,peek:Math.floor(Math.random()*20)+1},updatedAt:new Date().toISOString()};
     if(!commitCampaign(save,next,onChange,{render:true,message:"",focusScene:true}))status.textContent="The opening could not be saved. No use was spent.";
    }));
   }else if(!used&&race==="deep_gnome"){
    if(campaign.turn+1<MIN_CHAPTER_TURNS)trait.append(button("Chart a detour · no roll",()=>play({text:"Chart a safe detour around the immediate obstacle.",stat:"wis",difficulty:"standard"},{})));
    else trait.append(element("p","The decisive moment has come. A detour is available only for the first three decisions."));
   }else if(!used){
    const notes=rememberedRolls(campaign);
    if(race==="halfling"&&!notes.length)trait.append(element("p","First succeed on a check in this chapter to give your tale a deed to recall."));
    else{
     const form=element("form",undefined,"soa-mnm-ai-custom-action"),picker=(caption,items)=>{
      const label=element("label",caption,"soa-mnm-system-label"),select=element("select",undefined,"soa-mnm-system-input");
      for(const [value,text] of items){const opt=element("option",text);opt.value=String(value);select.append(opt)}label.append(select);form.append(label);return select;
     };
     const route=picker("Approach",campaign.scene.choices.map((c,i)=>[i,c.text]));
     let pick;
     if(race==="human")pick=picker("Draw on a different strength",STATS.map(s=>[s,STAT_NAMES[s]+" "+signed(mod(s))+" · "+humanMethods[s]]));
     if(race==="halfling")pick=picker("Remember a deed",notes.map((h,i)=>[i,h.die+" · "+h.action]));
     const preview=element("p",undefined,"soa-mnm-feature-status"),submit=element("button","Use "+feature.name,"soa-mnm-system-button");submit.type="submit";
     const refresh=()=>{const c=campaign.scene.choices[Number(route.value)],s=race==="human"?pick.value:c.stat;
      const fixed=race==="gnome"?12:race==="halfling"?notes[Number(pick.value)].die:null;
      submit.disabled=race==="human"&&s===c.stat;
      preview.textContent=submit.disabled?"Choose a different stat for this approach.":(fixed===null?"d20":String(fixed))+" "+signed(mod(s))+" ("+STAT_NAMES[s]+") vs DC "+c.dc+(fixed===null?"":resolveChoice({...c,stat:s},profile.stats,fixed).success?" · Will succeed":" · Will fall short");
     };
     route.onchange=refresh;if(pick)pick.onchange=refresh;refresh();
     form.onsubmit=e=>{e.preventDefault();const c=campaign.scene.choices[Number(route.value)];play(c,race==="human"?{stat:pick.value}:race==="halfling"?{deed:Number(pick.value)}:{})};
     form.append(preview,submit);trait.append(form);
    }
   }
   panel.append(trait);
  }
  const manual=disclosure("Try your own approach","soa-mnm-ai-custom-disclosure"),form=element("form",undefined,"soa-mnm-ai-custom-action");
  const actionLabel=element("label","Describe your action","soa-mnm-system-label"),action=element("textarea",undefined,"soa-mnm-system-input");action.maxLength=180;action.minLength=8;action.required=true;action.rows=2;actionLabel.append(action);form.append(actionLabel);
  const controls=element("div",undefined,"soa-mnm-ai-action-controls"),statLabel=element("label","Roll with","soa-mnm-system-label"),stat=element("select",undefined,"soa-mnm-system-input");
  STATS.slice().sort((a,b)=>mod(b)-mod(a)).forEach(key=>{const option=element("option",STAT_NAMES[key]+" "+signed(mod(key)));option.value=key;stat.append(option)});statLabel.append(stat);
  const diffLabel=element("label","Difficulty","soa-mnm-system-label"),diff=element("select",undefined,"soa-mnm-system-input");
  Object.entries(DIFFICULTY_DC).forEach(([key,dc])=>{const opt=element("option",key[0].toUpperCase()+key.slice(1)+" · DC "+dc);opt.value=key;diff.append(opt)});diff.value="standard";diffLabel.append(diff);controls.append(statLabel,diffLabel);form.append(controls);
  const submit=element("button","Roll for this action","soa-mnm-system-button");submit.type="submit";form.append(submit);
  form.addEventListener("submit",event=>{event.preventDefault();const text=clean(action.value,180);if(text.length<8){action.setCustomValidity("Describe your action in at least eight characters.");action.reportValidity();return}chooseAction(profile,save,panel,status,onChange,code(),{text,stat:stat.value,difficulty:diff.value})});action.oninput=()=>action.setCustomValidity("");
  manual.append(form);panel.append(manual);
  if(!isLocal)connection.append(button("Switch this chapter to local play",()=>continueLocally(profile,save,panel,status,onChange)));
 }
 if(complete&&!claimed(campaign.chapter))panel.append(rewardButton(campaign.chapter,"Claim chapter reward · 90 XP"));
 if(campaign.threads.length){const leads=disclosure("Unresolved leads · "+campaign.threads.length,"soa-mnm-ai-history"),list=element("ul",undefined,"soa-mnm-journal");campaign.threads.forEach(thread=>list.append(element("li",thread)));leads.append(list);panel.append(leads)}
 if(campaign.history.length){const history=disclosure("Recent choices and rolls","soa-mnm-ai-history"),list=element("ol",undefined,"soa-mnm-journal");list.reversed=true;campaign.history.slice(-8).reverse().forEach(row=>list.append(element("li","Chapter "+row.chapter+" · "+row.action+" — "+row.result+". "+row.summary)));history.append(list);panel.append(history)}
 if(campaign.chapters.length){const records=disclosure("Chapter journal · "+campaign.chapters.length,"soa-mnm-ai-history"),list=element("ul",undefined,"soa-mnm-journal");campaign.chapters.slice().reverse().forEach(row=>{const item=element("li","Chapter "+row.chapter+" · "+row.title+" · "+(row.status==="paused"?"Lead left open":"Complete")+". "+row.summary);if(row.status==="complete"&&!claimed(row.chapter)&&!(complete&&row.chapter===campaign.chapter))item.append(rewardButton(row.chapter,"Claim chapter "+row.chapter+" reward · 90 XP"));list.append(item)});records.append(list);panel.append(records)}
 panel.append(connection);return panel;
}
window.soaMnmAiChronicle=Object.freeze({version:VERSION,maxTurns:MAX_TURNS,difficultyDC:DIFFICULTY_DC,createCampaign,validCampaign,validScene,migrateCampaign,resolveChoice,render});
})();

