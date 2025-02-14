<p align="center">
  <a href="https://github.com/ValentinChanter/Tanky">
    <h3 align="center">Tanky</h3>
  </a>
</p>

<p align="center">Manage your Factory IO tank using this app.</p>

<br/>

## Introduction

This app allows you to manage the tank in the provided scene. You can fill it, drain it and stop everything.

It was made with [Next.js](https://nextjs.org/) for the frontend, [Flask](https://flask.palletsprojects.com/en/3.0.x/) for the backend, and [Tailwind CSS](https://tailwindcss.com/) for styling.

## Features

- Customize the slave address of the tank
- Customize the fill and drain rates in real-time
- Real-time tank and flow levels using Websocket
- Tank level visualization
- Responsive design

## Requirements

This app was tested with Node v22.14.0, Python 3.11.7, both npm and pnpm, and on Firefox, Opera and Chrome (Android). \
As [Factory IO](https://factoryio.com) is a Windows-only app, this web app wasn't designed for Unix-based systems.

## Installation

1. Clone this repo and access it

    ```bash
    git clone https://github.com/ValentinChanter/Tanky
    cd Tanky
    ```

2. Install node dependencies

    ```bash
    npm install
    # or
    yarn
    # or
    pnpm install
    ```

3. Create and switch to your virtual environment. Note that the `dev` script uses the venv specifically located in `./venv`
  
    ```bash
    python -m venv venv
    venv/Script/activate.ps1
    ```

4. Install python dependencies

	```bash
	pip install -r requirements.txt
	```

## Usage

1. Open Factory IO and load [the provided scene](https://github.com/ValentinChanter/Tanky/blob/main/public/tank.factoryio). If you want to use your own scene with a tank, just make sure to use Modbus TCP/IP Server as the driver, take note of its slave address, and configure it as follows:
   
    | Sensors/Actuators      | Register      |
    |------------------------|---------------|
    | Tank (Level Meter)     | Input Reg 0   |
    | Tank (Flow Meter)      | Input Reg 1   |
    | Tank (Fill Valve)      | Holding Reg 0 |
    | Tank (Discharge Valve) | Holding Reg 1 |

    The default port is 502 and cannot be changed through the UI. You can manually change the `DEFAULT_PORT` constant in [this file](https://github.com/ValentinChanter/Tanky/blob/main/api/index.py).

2. Run the development server.

    ```bash
    npm run dev
    # or
    yarn dev-yarn
    # or
    pnpm dev-pnpm
    ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the app. The Flask server will be running on [http://127.0.0.1:5328](http://127.0.0.1:5328).

## Troubleshooting

### Flask server doesn't start

If you're using a venv that's not located in `Tanky/`, the `flask-dev` script in `package.json` won't be able to start. If you're using this very virtual environment, make sure you successfully activated it before installing the dependencies.

### `venv/Script/activate.ps1` doesn't work

By default, the execution policy is on `restricted`. You can change it by opening a PowerShell with administrator privileges and running

```bash
Set-ExecutionPolicy unrestricted
```

Make sure to change the policy back after activating your virtual environment.

```bash
Set-ExecutionPolicy restricted
```

### The UI is showing the tank filling but the water level isn't rising

Did you click "Play" in Factory IO?