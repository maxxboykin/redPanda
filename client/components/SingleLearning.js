import React, { useRef, useState, useEffect, useReducer} from "react";
import {useSelector, useDispatch} from 'react-redux'
import * as tf from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import Webcam from "react-webcam";
import * as fp from "fingerpose";
import {fetchPhrases} from '../store/phrases'
import {allGestures} from '../letterGestures'


const SingleLearning = (props) => {
  const dispatch = useDispatch();
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const [currentLetter, setLetter] = useState("");
  const [emoji, setEmoji] = useState(null);
  const [images, setImages] = useState({})
  let allLetters = useSelector((state) => state.phrases)

  const lettersOnly = allLetters.map(letter => letter.letterwords);
  //Object is now 2d array: [[key1,value1], [key2,value2]]
  const currentGestures = Object.entries(allGestures)
    .filter(entry => {
      //key = key1 & value = value1  ..etc
      const [key, value] = entry
      return lettersOnly.includes(key)
    })
    .map(entry => {
      const [key, value] = entry
      return value;
    })

  const gestureAccuracyMany = 10;
  const gestureAccuracyOne = 9.5;

  //Like componentDidMount
  useEffect(() => {
    dispatch(fetchPhrases(props.match.params.tier)) //need to make tier dynamic------<<
  }, [])

  //Like componentWillUpdate
  useEffect(() => {
    const run = async () => {
      const intervalId = await runHandpose();
      return intervalId
    }
    const intervalId = run()

    // Like componentWillUnmount
    return async () => {
      clearInterval(await intervalId)
    }
  }, [currentLetter]);

  //componentWillUpdate to get allLetters
  useEffect(() => {
    allLetters[0] ? setLetter(allLetters[0].letterwords) : ''
    setImages(allLetters.reduce((accu,letter) => {
      accu[letter.letterwords] = letter.url
      return accu
    },{}))
  }, [allLetters])


  const runHandpose = async () => {
    const net = await handpose.load();

    //Loop and detect hands
    let intervalId = setInterval(async () => {
      let result = await detect(net);

      if (result === currentLetter) {
        clearInterval(intervalId);

        const letterIndex = lettersOnly.indexOf(currentLetter) + 1;

        if (letterIndex < lettersOnly.length) {
          setTimeout(() => {
            setLetter(lettersOnly[letterIndex]);
          }, 3000); // timer for between gestures
        } //else statement to update database upon completion
      }
    }, 100);

    return intervalId
  };

  const detect = async net => {
    //Check data is available
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      //Get video properties
      const video = webcamRef.current.video;
      const videoWidth = webcamRef.current.video.videoWidth;
      const videoHeight = webcamRef.current.video.videoHeight;

      //Set video height and width
      webcamRef.current.video.width = videoWidth;
      webcamRef.current.video.height = videoHeight;

      //Set canvas height and width
      canvasRef.current.width = videoWidth;
      canvasRef.current.height = videoHeight;

      // Make detections
      const hand = await net.estimateHands(video);

      // Gesture detections
      if (hand.length > 0) {
        const GE = new fp.GestureEstimator(currentGestures);

        //second argument is the confidence level
        const gesture = await GE.estimate(hand[0].landmarks, 8);

        if (gesture.gestures !== undefined && gesture.gestures.length > 0) {
          const confidence = gesture.gestures.map(
            prediction => prediction.score
          );

          const maxConfidence = confidence.indexOf(
            Math.max.apply(null, confidence)
          );

          console.log(gesture);

          const maxGesture = gesture.gestures[maxConfidence];

          if (
            (gesture.gestures.length === 1 &&
              maxGesture.score >= gestureAccuracyOne) ||
            maxGesture.score >= gestureAccuracyMany
          ) {
            setEmoji(maxGesture.name);
            return maxGesture.name;
          }
        }
      }
    }
  };
  // console.log("emoji", emoji);
  console.log("allLetters", allLetters)
  console.log('currentLetter',currentLetter)
  console.log('images',images)


  let emojiPrint =
    emoji === currentLetter ? (
      <img
        src="https://cdn2.iconfinder.com/data/icons/greenline/512/check-512.png"
        style={{
          position: "absolute",
          marginLeft: "auto",
          marginRight: "auto",
          left: 400,
          bottom: 50,
          right: 0,
          textAlign: "center",
          height: 100,
        }}
      />
    ) : (
      ""
    );

  return (
    <div className="App">
      <header className="App-header">
        <Webcam
          ref={webcamRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zindex: 9,
            width: 640,
            height: 480,
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            right: 0,
            textAlign: "center",
            zindex: 9,
            width: 640,
            height: 480,
          }}
        />
        {/* <div
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 0,
            top: 100,
            right: 0,
            textAlign: "center",
            height: 100,
          }}
        >
          Copy gesture to complete
        </div> */}
        <img
          src={images[currentLetter]}
          style={{
            position: "absolute",
            marginLeft: "auto",
            marginRight: "auto",
            left: 100,
            bottom: 50,
            right: 0,
            textAlign: "center",
            height: 100,
          }}
        />

        {emojiPrint}
      </header>
    </div>
  );
}

export default SingleLearning
