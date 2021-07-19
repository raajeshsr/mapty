'use strict';

class Workout {
  constructor(distance, duration, coords, type) {
    this.id = new Date().getTime();
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
    this.type = type;
    this.date = new Date();
    this._setDescription();
  }
  _setDescription() {
    //prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${
      this.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
    } ${this.type.replace(this.type[0], this.type[0].toUpperCase())} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords, 'running');
    this.cadence = cadence; // steps per minute
    this._calcPace();
  }

  _calcPace() {
    // time taken to run 1 km  (min/km )
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  constructor(distance, duration, coords, elevation) {
    super(distance, duration, coords, 'cycling');
    this.elevation = elevation;
    this._calcSpeed();
  }
  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60); //km per hr
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const clearBtn = document.querySelector('.clearBtn');

//Application architecture
class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();

    //event listeners
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleField);

    // containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));

    containerWorkouts.addEventListener(
      'click',
      this._containerWorkoutsEventHandler.bind(this)
    );

    clearBtn.addEventListener('click', this._clearLocalStorage);
  }

  _getPosition() {
    navigator.geolocation.getCurrentPosition(position => {
      const { latitude, longitude } = position.coords;

      const coords = [latitude, longitude];
      this._loadMap(coords);
    }),
      error => {
        console.log(error.message);
      };
  }

  _loadMap(coords) {
    console.log('load map');
    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //map click event listener
    this.#map.on('click', this._showForm.bind(this));

    this._getWorkoutDataFromLocalStorage();

    if (this.#workouts.length > 0) clearBtn.classList.remove('hidden');
  }

  _showForm(ev) {
    this.#mapEvent = ev;
    inputDistance.value = '';
    inputDuration.value = '';
    inputCadence.value = '';
    inputElevation.value = '';
    inputDistance.focus();
    form.classList.remove('hidden');
  }

  _toggleField(e) {
    inputCadence.parentElement.classList.toggle('form__row--hidden');
    inputElevation.parentElement.classList.toggle('form__row--hidden');
  }

  _createMarker(workout) {
    workout.marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          minWidth: 100,
          maxWidth: 200,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(`${workout.description}`)
      .openPopup();
  }

  _newWorkout(e) {
    e.preventDefault();

    //helper functions
    const _validateUserData = (...inputs) =>
      inputs.every(input => Number.isFinite(input));

    const _allPositive = (...inputs) => inputs.every(input => input > 0);

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    const coords = [lat, lng];

    //validate form data
    if (type === 'running') {
      let cadence = +inputCadence.value;
      //guard function
      if (
        !_validateUserData(distance, duration, cadence) ||
        !_allPositive(distance, duration, cadence)
      )
        return alert('invalid input data');

      //create new running object
      workout = new Running(distance, duration, coords, cadence);
    }
    if (type === 'cycling') {
      let elevation = +inputElevation.value;
      //guard function
      if (
        !_validateUserData(distance, duration, elevation) ||
        !_allPositive(distance, duration)
      )
        return alert('invalid input data');

      //create new cycling object
      workout = new Cycling(distance, duration, coords, elevation);
    }

    //hide form
    this._hideForm();

    //create marker object and add it to workout
    this._createMarker(workout);

    //add workout to workouts array
    this.#workouts.push(workout);

    //render workout to the list
    this._renderWorkoutonList(workout);

    //make clear btn visible
    clearBtn.classList.remove('hidden');

    //store workout data to localstorage
    this._storeWorkoutDataToLocalStorage();

    //  delete selected workout  if update flag is true
    if (this.#mapEvent.update)
      this._deleteWorkout(this.#mapEvent.selectedWorkoutList);
  }
  _hideForm() {
    form.classList.add('hidden');
    inputDistance.blur();
    inputDuration.blur();
    inputCadence.blur();
    inputElevation.blur();
  }

  _renderWorkoutonList(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id='${
      workout.id
    }'>
          <button class="delete__workout">delete</button>
          <button class="edit__workout">edit</button>
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    html +=
      workout.type === 'running'
        ? `<div class="workout__details">
         <span class="workout__icon">⚡️</span>
         <span class="workout__value">${workout.pace.toFixed(1)}</span>
         <span class="workout__unit">min/km</span>
         </div>
         <div class="workout__details">
         <span class="workout__icon">🦶🏼</span>
         <span class="workout__value">${workout.cadence}</span>
         <span class="workout__unit">spm</span>
         </div>
         </li>`
        : `<div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/hr</span>
        </div>
        <div class="workout__details">
         <span class="workout__icon">⛰</span>
         <span class="workout__value">${workout.elevation}</span>
         <span class="workout__unit">m</span>
         </div>
        </li>`;
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToMarker(workoutList) {
    let workoutObj;

    for (const workout of this.#workouts) {
      if (workout.id === +workoutList.dataset.id) {
        workoutObj = workout;
      }
    }

    //guard clause
    if (!workoutObj) return;

    this.#map.setView(workoutObj.coords, 13);
  }

  _storeWorkoutDataToLocalStorage() {
    let workoutsCpy = this.#workouts.map(workout => {
      let workoutCpy = { ...workout };
      workoutCpy.marker = null;
      return workoutCpy;
    });

    localStorage.setItem('workouts', JSON.stringify(workoutsCpy));
  }

  _getWorkoutDataFromLocalStorage() {
    //guard clause
    if (!localStorage.getItem('workouts')) return;

    this.#workouts = JSON.parse(localStorage.getItem('workouts'));

    this.#workouts.forEach(workout => {
      this._createMarker(workout);
      this._renderWorkoutonList(workout);
    });
  }

  _clearLocalStorage() {
    localStorage.clear();
    location.reload();
  }

  _findWorkoutObj(selectedWorkoutList) {
    return this.#workouts.find(
      workout => workout.id === +selectedWorkoutList.dataset.id
    );
  }
  _containerWorkoutsEventHandler(e) {
    if (e.target.className === 'delete__workout') {
      this._deleteWorkout(e.target.parentElement);
      return;
    }

    if (e.target.className === 'edit__workout') {
      this._editWorkout(e.target.parentElement);
      return;
    }

    //select workout element
    let workoutList = e.target.closest('li');

    if (!workoutList) return;

    this._moveToMarker(workoutList);
  }
  _editWorkout(selectedWorkoutList) {
    //get corresponding  workout object
    const workoutObj = this._findWorkoutObj(selectedWorkoutList);

    //populate form with workout data to edit
    this._showForm({
      latlng: { lat: workoutObj.coords[0], lng: workoutObj.coords[1] },
      update: true,
      selectedWorkoutList,
    });

    inputDistance.value = workoutObj.distance;
    inputDuration.value = workoutObj.duration;
    inputType.value = workoutObj.type;

    if (workoutObj.type === 'running') {
      inputCadence.value = workoutObj.cadence;
      inputCadence.parentElement.classList.remove('form__row--hidden');
      inputElevation.parentElement.classList.add('form__row--hidden');
    }
    if (workoutObj.type === 'cycling') {
      inputElevation.value = workoutObj.elevation;
      inputCadence.parentElement.classList.add('form__row--hidden');
      inputElevation.parentElement.classList.remove('form__row--hidden');
    }

    //key enter event will triger new workout method to create new workout object
    // once workout is created deleter workout method is triggered to remove the old workout object
  }

  _deleteWorkout(selectedWorkoutList) {
    //get corresponding  workout object
    const workoutObj = this._findWorkoutObj(selectedWorkoutList);

    //remove marker
    workoutObj.marker.remove();

    //delete workout object
    const index = this.#workouts.indexOf(workoutObj);
    this.#workouts.splice(index, 1);

    //remove  workout element  from UI
    selectedWorkoutList.remove();

    //update localstorage
    this._storeWorkoutDataToLocalStorage();

    //remove clearall button if no workout object
    if (this.#workouts.length < 1) clearBtn.classList.add('hidden');
  }
}

let app = new App();
