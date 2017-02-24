'use strict';

navigator.getUserMedia = navigator.getUserMedia||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

window.onbeforeunload = function (e) {
  hangup();
}
//buttons
var callButton = document.getElementById("btnCall");
var endButton = document.getElementById("btnEndCall");
endButton.onclick = hangup;

//video elements
var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
//streams
var localStream;
var remoteStream;
//peerConnection
var peerConn;
//configuration for rtcpeerConnection
var peerConnConfig = null;
var peerConnConstraint = null;
var sdpConstraint = null;

var socket = io();

var room = prompt("Enter room name:");
if(room != ''){
  console.log('Create or join room', room);
  socket.emit('createOrJoin',room);
}

var constraint = {
  video:true,
  audio:true
};
// function mediaSuccess(stream) {
//   localStream = stream;
//   attachMedia(localVideo,stream);
//   sendMsg('gotUserMedia');
// }
// function attachMedia(player,stream) {
//   var myURL = window.URL || window.webkitURL;
//   var fileURL = myURL.createObjectURL(stream);
//   player.scr = fileURL;
//   player.play();
// }

function attachMedia(player,stream){
  if (navigator.getUserMedia) { // WebRTC 1.0 standard compliant browser
    player.srcObject = stream;
    player.play();
} else if (navigator.mozGetUserMedia) { // early firefox webrtc implementation
    player.mozSrcObject = stream;
    player.play();
} else if (navigator.webkitGetUserMedia) { // early webkit webrtc implementation
  player.src = webkitURL.createObjectURL(stream);
}
}

function mediaSuccess(stream) {
  localStream = stream;
  attachMedia(localVideo,stream);
console.log('Adding local stream.');
  sendMsg('gotUserMedia');
}

function mediaError(error){
  console.log("getUserMedia error: "+error);
}
//when room is created
socket.on('created',function(room){
  console.log('Created room ' + room);
  isInitiator = true;
  navigator.getUserMedia(constraint,mediaSuccess,mediaError);

  checkAndStart();

});
//when room is full maximum 2 client
socket.on('full',function(room){
  console.log('Room '+room+' is full');
});
//broadcast
socket.on('join',function(room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
  callButton.disabled = false;

  // console.log(isStarted);
  // console.log(isChannelReady);
  // if(localStream != 'undifined'){
  // console.log('local stream is ready');
//}

//  checkAndStart();
});
//second peer join the room
socket.on('joined',function(room) {
  console.log('This peer has joined room ' + room);
  isChannelReady = true;
  navigator.getUserMedia(constraint,mediaSuccess,mediaError);
  console.log('Getting user media with constraints', constraint);

  // console.log(isStarted);
  // console.log(isChannelReady);
  // if(localStream != 'undifined'){
  // console.log('local stream is ready');
 //}
 //wait(3000);
  //checkAndStart();
});

// function wait(ms){
//    var start = new Date().getTime();
//    var end = start;
//    while(end < start + ms) {
//      end = new Date().getTime();
//   }
// }

socket.on('log',function(array){
  console.log.apply(console,array);
});

socket.on('message',function(message){
  //console.log('Received message:', message);
  if(message === 'gotUserMedia'){
    console.log('gotUserMedia message Received');
    console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
    console.log(isStarted);
    console.log(isChannelReady);
    if(localStream != 'undifined'){
    console.log('local stream is ready');
  }
    console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@');
    checkAndStart();
  }else if(message.type === 'offer'){
    if(!isInitiator && !isStarted){
      checkAndStart();
    }
    console.log('offer detected');
    peerConn.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  }else if (message.type === 'answer' && isStarted) {
    peerConn.setRemoteDescription(new RTCSessionDescription(message));
    console.log('answer detected');
  }else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    console.log('candidate detected');
  peerConn.addIceCandidate(candidate);
//control with end button
}
});



function sendMsg(message){
  console.log('Sending message: ', message);
  socket.emit('message',message);
}

function checkAndStart(){
  if(!isStarted && typeof localStream != 'undifined' && isChannelReady){
    createPeerConnection();
    isStarted = true;
  }
//conrol with button
    if(isInitiator){
    //  callButton.disabled = false;
      callButton.onclick = doCall;
    }
}


function createPeerConnection(){
  try {
    console.log('inside peer connection');
    peerConn = new RTCPeerConnection(peerConnConfig,peerConnConstraint);
    peerConn.addStream(localStream);
    peerConn.onicecandidate = handleIceCandidate;
    console.log('Created RTCPeerConnnection with:\n' +
            ' config: \'' + JSON.stringify(peerConnConfig) + '\';\n' +
            ' constraints: \'' + JSON.stringify(peerConnConstraint) + '\'.');
  } catch (e) {
    console.log('Failed to create peerConnection error: '+e.message);
    return;
  }
  peerConn.onaddstream = handleRemoteStream;
  //peerConn.ontrack = handleRemoteStream;
  peerConn.onremovestream = handleRemoteStreamRemoved;
  console.log('creating peerConn successfully');
}

function handleIceCandidate(event) {
console.log('handleIceCandidate event: ', event);
  if(event.candidate){
    sendMsg({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  }else {
    console.log('End of candidate.');
  }
}

function doCall() {
    console.log('Creating Offer...');
  //  console.log(isStarted);
  //  console.log(isChannelReady);
  //  if(localStream != 'undifined'){
  //  console.log('local stream is ready');
  //}
  peerConn.createOffer(setLocalAndSendMsg,onSignalingError,sdpConstraint);
  callButton.disabled = true;
  endButton.disabled = false;
}

function onSignalingError(error){
  console.log('failed to create signaling message: '+error.message);
}

function doAnswer(){
  console.log('Sending answer to peer.');
  peerConn.createAnswer(setLocalAndSendMsg,onSignalingError,sdpConstraint);
  endButton.disabled = false;
}

function setLocalAndSendMsg(SDP){
  peerConn.setLocalDescription(SDP);
  sendMsg(SDP);
}

function handleRemoteStream(event){
  console.log('Remote stream added.');
  attachMedia(remoteVideo,event.stream);
  console.log('Remote stream attached!!.');
  remoteStream = event.stream;
}

function handleRemoteStreamRemoved(event){
  console.log('Remote stream removed.'+event);
}
function hangup() {
  console.log('hanging up');
  stop();
}

function stop() {
  isStarted = false;
  isInitiator = false;
  isChannelReady = false;
  localVideo.pause();
  remoteVideo.pause();
  if(peerConn) peerConn.close();
  peerConn = null;
  callButton.disabled = true;
  endButton.disabled = true;
}
