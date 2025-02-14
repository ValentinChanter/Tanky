"use client";

import { ChangeEvent, useState, useEffect, useRef } from 'react'
import io from "socket.io-client";

const socket = io("http://localhost:5328");

export default function Home() {
  const [inputIp, setInputIp] = useState('127.0.0.1');
  const [ip, setIp] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [cannotConnect, setCannotConnect] = useState(false);
  const [fillRate, setFillRate] = useState(500);
  const [drainRate, setDrainRate] = useState(500);
  const [isFilling, setIsFilling] = useState(false);
  const [isDraining, setIsDraining] = useState(false);
  const [tankLevel, setTankLevel] = useState(0);
  const [flowLevel, setFlowLevel] = useState(0);
  const [lights, setLights] = useState(false);
  const [alarm, setAlarm] = useState(false);

  const [lastFillRateUpdate, setLastFillRateUpdate] = useState(0);
  const [lastDrainRateUpdate, setLastDrainRateUpdate] = useState(0);

  useEffect(() => {
    socket.on("data", (data: {level: number, flow: number}) => {
      setTankLevel(data.level);
      setFlowLevel(data.flow);
  
      setLights((prevLights) => {
        if (data.level > 850 && !prevLights) {
          return true;
        } else if (data.level <= 850 && prevLights) {
          return false;
        }
        return prevLights;
      });

      setAlarm((prevAlarm) => {
        if (data.flow > 900 && !prevAlarm) {
          return true;
        } else if (data.flow <= 900 && prevAlarm) {
          return false;
        }
        return prevAlarm;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const alarmAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!alarmAudio.current) {
      alarmAudio.current = new Audio('/alarm.wav');
      alarmAudio.current.loop = true;
    }

    if (alarm) {
      alarmAudio.current.play().catch((err) => console.error("Audio play error:", err));
    } else {
      alarmAudio.current.pause();
      alarmAudio.current.currentTime = 0;
    }

    return () => {
      if (alarmAudio.current) {
        alarmAudio.current.pause();
        alarmAudio.current.currentTime = 0;
      }
    };
  }, [alarm]);

  function connect(ip: string) {
    if (ip.match(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/)) {
      setIsConnecting(true);
      fetch('/api/set_address', {
        method: 'POST',
        body: JSON.stringify({ address: ip }),
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(res => {
        setIsConnecting(false);
        if (res.status === 200) return res.json();
        else {
          if (res.status === 500) setCannotConnect(true);
          console.log('Failed to set address');
        }
      }).then(data => {
        if (!data) return;
        const address = data.address as string;
        const isFilling = data.is_filling as boolean;
        const isDraining = data.is_draining as boolean;
        
        setIp(address);
        setIsFilling(isFilling);
        setIsDraining(isDraining);
      }).catch(error => {
        console.error(error);
      });
    }
  }

  function disconnect() {
    fetch('/api/disconnect', {
      method: 'POST'
    }).then(res => {
      if (res.status === 200) {
        setIp('');
        setIsDraining(false);
        setIsFilling(false);
      } else throw new Error('Failed to clear address');
    }).catch(error => {
      console.error(error);
    });
  }

  function changeFillRate(e: ChangeEvent) {
    const rate = (e.target as HTMLInputElement).valueAsNumber;

    if (rate != fillRate) {
      setFillRate(rate);

      if (e.timeStamp - lastFillRateUpdate > 5) {
        setLastFillRateUpdate(e.timeStamp);
        
        fetch('/api/set_fill_rate', {
          method: 'POST',
          body: JSON.stringify({ rate: rate }),
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(res => {
          if (res.status !== 200) throw new Error('Failed to set fill rate');
        }).catch(error => {
          console.error(error);
        });
      }
    }
  }

  function changeDrainRate(e: ChangeEvent) {
    const rate = (e.target as HTMLInputElement).valueAsNumber;

    if (rate != drainRate) {
      setDrainRate(rate);

      if (e.timeStamp - lastDrainRateUpdate > 5) {
        setLastDrainRateUpdate(e.timeStamp);
  
        fetch('/api/set_drain_rate', {
          method: 'POST',
          body: JSON.stringify({ rate: rate }),
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(res => {
          if (res.status !== 200) throw new Error('Failed to set drain rate');
        }).catch(error => {
          console.error(error);
        });
      }
    }
  }

  function fill() {
    fetch('/api/fill', {
      method: 'POST'
    }).then(res => {
      if (res.status !== 200) throw new Error('Failed to fill');
      else {
        setIsFilling(true);
        setIsDraining(false);
      }
    }).catch(error => {
      console.error(error);
    });
  }

  function drain() {
    fetch('/api/drain', {
      method: 'POST'
    }).then(res => {
      if (res.status !== 200) throw new Error('Failed to drain');
      else {
        setIsDraining(true);
        setIsFilling(false);
      }
    }).catch(error => {
      console.error(error);
    });
  }

  function stop() {
    fetch('/api/stop', {
      method: 'POST'
    }).then(res => {
      if (res.status !== 200) throw new Error('Failed to stop');
      else {
        setIsDraining(false);
        setIsFilling(false);
      }
    }).catch(error => {
      console.error(error);
    });
  }

  function understood() {
    setCannotConnect(false);
  }

  return (
    <div className='relative flex min-h-screen flex-col justify-center overflow-hidden bg-gray-50 py-6'>
      <div className={`absolute inset-0 bg-center bg-linear-to-l animated-background ${lights ? "from-red-500 to-red-500 via-yellow-300" : "from-violet-300 to-violet-300 via-green-200"}`}></div>
      <div className="relative flex flex-row justify-evenly w-full">
        <div className='w-2/5 px-6 py-8'>
          <div className='rounded-b-xl border-black border-x-8 border-b-8 h-full w-4/5 mx-auto relative'>
            <div className='w-full h-full bg-white/50 backdrop-blur-sm absolute z-10'></div>
            <div className='w-full h-full flex flex-col justify-end absolute z-0'>
              <div className="w-full bg-blue-500" style={{ height: `${tankLevel/10}%` }}></div>
            </div>
            <div className={`w-full h-[150%] top-[-50%] absolute z-0 flex flex-row justify-center${isFilling ? " opacity-100" : " opacity-0"} transition-opacity duration-500`}>
              <div className="h-full bg-blue-500" style={{ width: `${fillRate*3/100}%` }}></div>
            </div>
            <div className={`w-[100%] h-full left-[-100%] absolute z-0 flex flex-col justify-end${isDraining ? " opacity-100" : " opacity-0"} transition-opacity duration-500`}>
              <div className='w-full bg-transparent border-black border-y-8 border-r-8 absolute' style={{ height: `${drainRate*2/100}%` }}></div>
              <div className="w-full bg-blue-500" style={{ height: `${Math.min(drainRate*2/100, tankLevel/10)}%` }}></div>
            </div>
          </div>
        </div>
        <div className='w-2/5 bg-white px-6 lg:px-7 xl:px-8 pt-4 lg:pt-8 xl:pt-10 pb-2 lg:pb-6 xl:pb-8 shadow-xl ring-1 ring-gray-900/5 rounded-lg'>
          <div className={`flex flex-col lg:flex-row justify-center w-full text-black py-2 xl:py-4 mb-4 lg:mb-8 xl:mb-12 text-sm lg:text-base xl:text-lg text-center`}>
            <input type='text' className={`ip-input px-2 py-1 mr-4 lg:mr-8 text-right w-full md:w-full lg:w-1/3 xl:w-1/4${ip || cannotConnect ? " hidden" : ""}`} value={inputIp} placeholder='127.0.0.1' pattern='^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$' onChange={(e) => setInputIp(e.target.value)}></input>
            <button className={`blue-button p-2 lg:px-4 lg:py-2 text-white mt-4 lg:mt-0 button${ip || cannotConnect ? " hidden" : ""}`} disabled={isConnecting} onClick={() => connect(inputIp)}>{isConnecting ? "Connecting..." : "Connect"}</button>
            <div className={`text-black ${ip ? "" : " hidden"}`}>
              <span>Connected to </span><span className='font-bold mr-4 lg:mr-8'>{ip}</span>
              <button className="blue-button p-2 lg:px-4 lg:py-2 text-white button mt-4 lg:mt-0" onClick={() => disconnect()}>Disconnect</button>
            </div>
            <div className={`text-black ${cannotConnect ? "" : " hidden"}`}>
              <span>Unable to reach </span><span className='font-bold mr-4 lg:mr-8'>{inputIp}</span>
              <button className="blue-button p-2 lg:px-4 lg:py-2 text-white mt-4 lg:mt-0 button" onClick={() => understood()}>Understood</button>
            </div>
          </div>
          <div className='flex flex-col lg:flex-row justify-evenly mb-4 lg:mb-6 xl:mb-8'>
            <div className="w-full mb-2 lg:w-1/3 xl:w-1/4 lg:mb-0">
              <label htmlFor="fillRate" className="block mb-2 text-sm lg:text-base xl:text-lg text-black">Fill rate: {fillRate/10}%</label>
              <input id="fillRate" type="range" min="1" max="1000" value={fillRate} disabled={ip == ''} className="slider" onChange={(e) => changeFillRate(e)}></input>
            </div>
            <div className="w-full mb-2 lg:w-1/3 xl:w-1/4 lg:mb-0">
              <label htmlFor="drainRate" className="block mb-2 text-sm lg:text-base xl:text-lg text-black">Drain rate: {drainRate/10}%</label>
              <input id="drainRate" type="range" min="1" max="1000" value={drainRate} disabled={ip == ''} className="slider" onChange={(e) => changeDrainRate(e)}></input>
            </div>
          </div>
          <div className='flex flex-row justify-evenly mb-6 md:mb-10 lg:mb-12 xl:mb-16'>
            <button className='green-button button w-10 h-10 md:w-15 md:h-15 lg:w-20 lg:h-20 xl:w-25 xl:h-25' disabled={ip == ''} onClick={() => fill()}>
              <div className='text-sm md:text-md lg:text-lg xl:text-xl text-white font-bold'>Fill</div>
            </button>
            <button className='red-button button w-10 h-10 md:w-15 md:h-15 lg:w-20 lg:h-20 xl:w-25 xl:h-25' disabled={ip == ''} onClick={() => drain()}>
              <div className='text-sm md:text-md lg:text-lg xl:text-xl text-white font-bold'>Drain</div>
            </button>
          </div>
          <div className='flex flex-row justify-center mb-6 md:mb-10 lg:mb-12 xl:mb-16'>
            <button className='red-button button w-10 h-10 md:w-15 md:h-15 lg:w-20 lg:h-20 xl:w-25 xl:h-25' disabled={ip == ''} onClick={() => stop()}>
              <div className='text-xl md:text-3xl lg:text-4xl xl:text-5xl text-amber-300 font-bold'>⚠️</div>
            </button>
          </div>
          <div className='flex flex-col lg:flex-row justify-evenly mb-6 md:mb-10 lg:mb-12 xl:mb-16'>
            <div className='flex flex-col w-full lg:w-2/5 mb-4 lg:mb-0'>
              <span className='text-black text-left lg:text-right text-sm lg:text-base xl:text-lg pb-2'>Tank level</span>
              <div className='w-full flex flex-row justify-end'>
                <span className='ring-1 ring-gray-900/5 bg-slate-700 pr-2 py-2 md:pr-3 md:py-3 lg:pr-4 lg:py-4 rounded-lg text-white text-xl md:text-2xl lg:text-3xl text-right w-full xl:w-2/3 inset-shadow-md'>
                  {tankLevel/10}%
                </span>
              </div>
            </div>
            <div className='flex flex-col w-full lg:w-2/5'>
              <span className='text-black text-left text-sm lg:text-base xl:text-lg pb-2'>Flow level</span>
              <div className='w-full flex flex-row justify-start'>
                <span className='ring-1 ring-gray-900/5 bg-slate-700 pr-2 py-2 md:pr-3 md:py-3 lg:pr-4 lg:py-4 rounded-lg text-white text-xl md:text-2xl lg:text-3xl text-right w-full xl:w-2/3 inset-shadow-md'>
                  {flowLevel/10}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
