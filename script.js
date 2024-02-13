'use strict';

class Workout {
  date = new Date();
  id = Date.now() + ''.slice(-10);
  constructor(coords, distance, duration) {
    this.coords = coords; // [latitute, longitude]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type === 'running' ? 'Running' : 'Cycling'}: ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
  }
}

//////////////////////////////////
// application architecture

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #dropBtns;
  #btnsClear;
  #btnsDelete;
  #btnsEdit;

  constructor() {
    // get user's position
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();
    this.#dropBtns = document.querySelectorAll('.dropbtn');
    this.#btnsClear = document.querySelectorAll('.clear');
    this.#btnsDelete = document.querySelectorAll('.delete');
    this.#btnsEdit = document.querySelectorAll('.edit');

    // attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._movetoPopup.bind(this));

    // Open dropdowns by click on dropbtn
    this.#dropBtns.forEach(dropBtn => {
      dropBtn.addEventListener('click', this._showDropdown);
    });

    // Close dropdowns by click anywhere
    document.body.addEventListener('click', this._closeDropdowns, true);

    // Clear all workouts
    this.#btnsClear.forEach(clear =>
      clear.addEventListener('click', this._clearAllWorkouts.bind(this))
    );

    // Delete a workout
    this.#btnsDelete.forEach(d => d.addEventListener('click', this._delete));

    // Edit btn
    this.#btnsEdit.forEach(edit =>
      edit.addEventListener('mouseover', this._edit)
    );
    this.#btnsEdit.forEach(edit =>
      edit.addEventListener('mouseout', this._editLeave)
    );

    // check body width for caption text
    this._changeCaption();
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          return Swal.fire({
            icon: 'error',
            title: 'Could not get your location!😭',
            background: '#2d3439',
            heightAuto: false,
            width: 'auto',
          });
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // empty inputs
    inputDistance.value = '';
    inputCadence.value = '';
    inputDuration.value = '';
    inputElevation.value = '';
    inputDistance.blur();
    inputCadence.blur();
    inputDuration.blur();
    inputElevation.blur();

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout running, create running object
    if (type === 'running') {
      // check if data is valid
      const cadence = +inputCadence.value;
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(candence)  // just thought about creating a function for easier readability
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        // return alert('Inputs have to positive numbers!😤');

        return Swal.fire({
          icon: 'error',
          title: 'Inputs have to be positive numbers!😤',
          background: '#2d3439',
          heightAuto: false,
          width: 'auto',
        });

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout cycilng, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        // return alert('Inputs have to positive numbers!😤');

        return Swal.fire({
          icon: 'error',
          title:
            'Make sure your Duration and Distance inputs are positive numbers!😤',
          background: '#2d3439',
          heightAuto: false,
          width: 'auto',
        });

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // render workout on map as marker
    this._renderWorkoutMarker(workout);

    // add neighbourhood name to the workout heading
    this._setNeighbourhood(workout);
  }

  async _setNeighbourhood(workout) {
    try {
      // timeout counter
      const timeout = function (sec) {
        return new Promise(function (_, reject) {
          setTimeout(function () {
            reject(new Error('Request took too long!'));
          }, sec * 1000);
        });
      };

      // check if api doesn't respond in 3 seconds
      const res = await Promise.race([
        fetch(
          `https://geocode.xyz/${workout.coords.at(0)},${workout.coords.at(
            1
          )}?geoit=json&auth=20350830646274585843x105669 `
        ),
        timeout(3),
      ]);

      const data = await res.json();
      workout.neighbourhood = data.city;
    } catch (err) {
      console.error(err);
    } finally {
      // add new object to workouts array
      this.#workouts.push(workout);

      // render workout on the list
      this._renderWorkout(workout);

      // hide form and clear inputs
      this._hideForm();

      // set locale storage
      this._setLocalStorage();

      // update dropbtns
      this.#dropBtns = document.querySelectorAll('.dropbtn');
      this.#dropBtns.forEach(dropBtn => {
        dropBtn.addEventListener('click', this._showDropdown);
      });

      // update Clear all workouts
      this.#btnsClear = document.querySelectorAll('.clear');
      this.#btnsClear.forEach(clear =>
        clear.addEventListener('click', this._clearAllWorkouts.bind(this))
      );

      // update delete a workout
      this.#btnsDelete = document.querySelectorAll('.delete');
      this.#btnsDelete.forEach(d => d.addEventListener('click', this._delete));

      // update Edit btn
      this.#btnsEdit = document.querySelectorAll('.edit');
      this.#btnsEdit.forEach(edit =>
        edit.addEventListener('mouseover', this._edit)
      );
      this.#btnsEdit.forEach(edit =>
        edit.addEventListener('mouseout', this._editLeave)
      );
    }
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: true,
          closeOnClick: false,
          className: `${workout.type}-popup ${workout.id}`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <div class="dropdown">
    <ul
      class="dropbtn icons btn-right showLeft"
    >
      <li></li>
      <li></li>
      <li></li>
    </ul>

    <div id="myDropdown" class="dropdown-content">
      <a href="javascript:void(0)" class="edit">Edit</a>
      <a href="javascript:void(0)" class="delete">Delete</a>
      <a href="javascript:void(0)" class="clear">Clear all workouts</a>
    </div>
  </div>
          <h2 class="workout__title">
            ${workout.description} &nbsp;${
      workout.neighbourhood ? workout.neighbourhood : ''
    }
          </h2>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚴‍♀️'
            } </span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
            `;
    } else {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">📈</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
            `;
    }

    form.insertAdjacentHTML('afterend', html);
    form.classList.add('hidden');
  }

  _movetoPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _showDropdown() {
    this.nextElementSibling.classList.toggle('show');
  }

  _closeDropdowns(e) {
    if (!e.target.matches('.edit'))
      document
        .querySelectorAll('.dropdown-content')
        .forEach(d => d.classList.remove('show'));
  }

  _clearAllWorkouts() {
    localStorage.removeItem('workouts');
    const workoutElements = [...document.querySelectorAll('.workout')];
    const popups = [...document.querySelectorAll('.leaflet-popup')];
    const markers = [...document.querySelectorAll('.leaflet-marker-icon')];
    // const shadows = [...document.querySelectorAll(".leaflet-shadow-pane")];
    popups.forEach(popup => (popup.style.display = 'none'));
    markers.forEach(marker => (marker.style.display = 'none'));
    workoutElements.forEach(workout => (workout.style.display = 'none'));
    // shadows.forEach((shadow) => (shadow.style.display = "none"));
    this.#workouts = [];
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _delete() {
    app.#workouts = app.#workouts.filter(
      workout => workout.id != this.closest('.workout').dataset.id
    );
    localStorage.setItem('workouts', JSON.stringify(app.#workouts));
    this.closest('.workout').remove();

    const popups = [...document.querySelectorAll('.leaflet-popup')];
    const markers = [...document.querySelectorAll('.leaflet-marker-icon')];

    popups.forEach(popup => {
      if (popup.classList.contains(`${this.closest('.workout').dataset.id}`)) {
        popup.style.display = 'none';
      }
    });

    markers.forEach(marker => {
      if (marker.classList.contains(`${this.closest('.workout').dataset.id}`)) {
        marker.style.display = 'none';
      }
    });
  }

  _edit() {
    this.textContent = `Coming soon ...`;
    this.style.fontStyle = 'italic';
  }

  _editLeave() {
    this.textContent = `Edit`;
    this.style.fontStyle = 'inherit';
  }

  _changeCaption() {
    if (document.querySelector('body').clientWidth <= 1200) {
      document.querySelector(
        '.workout-caption'
      ).innerHTML = `Touch the map to save your workout details.<br/>You won't lose them if you reload the page!`;
    }
  }
}
const app = new App();

// easier way to delete workouts
// reset() {
//   localStorage.removeItem('workouts');
//   location.reload();
// }
