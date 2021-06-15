// BUG: indexing is messed when removing items from table
// POSSIBLE SOLUTION: $('#quizBody').find('tr:last').index()

// BUG: dublicate entry is shown in the table when submitting the answer fast after page loads
// POSSIBLE SOLUTION: timeout

firebase.initializeApp(firebaseConfig);

mapboxgl.accessToken = mapboxConfig.accessToken;
var map = new mapboxgl.Map({
  container: "map", // container ID
  style: "mapbox://styles/mapbox/satellite-streets-v11", // style URL
  center: [66.923684, 48.019573], // starting position [lng, lat]
  zoom: 4, // starting zoom
});

let index = 0;

var triggeredByReset = false;

var historyPosition = 0;

var clearArray = [];
var triggeredByClear = false;

var correctCount = 0;
var wrongCount = 0;

function filterAnswers() {
  var filter = document.getElementById("myFilter").value;
  var body = document.getElementById("quizBody");
  var rows = body.getElementsByTagName("tr");
  var listIsEmpty = document.getElementById("emptyRow");

  var correctCountF = 0;
  var wrongCountF = 0;

  for (var i = 1; i < rows.length; i++) {
    let checkAnswer = rows[i].getElementsByTagName("td")[2];
    if (checkAnswer) {
      if (checkAnswer.style.color == "green") {
        correctCountF++;
      } else if (checkAnswer.style.fontStyle == "italic") {
        wrongCountF++;
      }
    }
  }

  for (var i = 1; i < rows.length; i++) {
    let checkAnswer = rows[i].getElementsByTagName("td")[2];
    if (checkAnswer) {
      if (filter === "Correct") {
        if (checkAnswer.style.color == "green") {
          rows[i].style.display = "";
        } else {
          rows[i].style.display = "none";
        }
      } else if (filter === "Wrong") {
        if (checkAnswer.style.fontStyle === "italic") {
          rows[i].style.display = "";
        } else {
          rows[i].style.display = "none";
        }
      } else {
        rows[i].style.display = "";
      }
    }
  }

  if (
    (filter === "Correct" && correctCountF == 0) ||
    (filter === "Wrong" && wrongCountF == 0) ||
    (filter === "All" && correctCountF + wrongCountF == 0)
  ) {
    listIsEmpty.style.display = "";
  } else {
    listIsEmpty.style.display = "none";
  }
}

function writeToDatabase(
  index,
  shown,
  check,
  correct,
  country,
  guess,
  correctCount,
  wrongCount
) {
  var newKey = firebase.database().ref("/guesses/").push();
  newKey.set({
    index: index,
    shown: shown,
    check: check,
    correct: correct,
    country: country,
    guess: guess,
    correctCount: correctCount,
    wrongCount: wrongCount,
  });

  return newKey;
}

function readFromDatabase() {
  firebase
    .database()
    .ref("/guesses/")
    .get()
    .then((snapshot) => {
      var myValue = snapshot.val();
      if (myValue) {
        var keyList = Object.keys(myValue);

        for (var i = 0; i < keyList.length; i++) {
          let myKey = keyList[i];
          let myItem = myValue[myKey];
          let dbKey = firebase.database().ref("/guesses/" + myKey);

          if (myItem.shown) {
            let [newRow, changeRow] = addRow(-1);
            fillRow(
              myItem.check,
              changeRow,
              myItem.country,
              myItem.correct,
              myItem.guess,
              dbKey,
              newRow
            );
          }
        }

        document.getElementById("myFilter").onchange();
      }
    });
}

function findCoordinates(country) {
  for (var i = 0; i < window.coordinates.length; i++) {
    let countryPlace = window.coordinates[i];
    if (countryPlace["country"] === country) {
      return countryPlace.coordinates;
    }
  }
}

function addRow(index) {
  var quizTable = document.getElementById("quizTable");
  var newRow = quizTable.insertRow(index);
  var newCellCountry = newRow.insertCell(0);
  var newCellCapital = newRow.insertCell(1);
  var newCellCheck = newRow.insertCell(2);
  var changeRow = [newCellCapital, newCellCountry, newCellCheck];

  return [newRow, changeRow];
}

function fillRow(
  check,
  changeRow,
  countryAnswered,
  correctCapital,
  capitalAnswered,
  dbKey,
  newRow
) {
  changeRow[1].innerHTML = countryAnswered;
  changeRow[2].innerHTML = correctCapital;
  if (check) {
    changeRow[0].innerHTML = correctCapital;
    for (var i = 0; i < 3; i++) {
      changeRow[i].style.color = "green";
    }
  } else {
    changeRow[0].innerHTML = capitalAnswered;
    changeRow[0].style.textDecoration = "line-through";
    changeRow[2].style.fontStyle = "italic";
    for (var i = 0; i < 3; i++) {
      changeRow[i].style.color = "red";
    }
  }

  let currentCoordinates = findCoordinates(countryAnswered);
  let timeout;

  changeRow[1].addEventListener("mouseenter", function () {
    timeout = setTimeout(function () {
      map.setCenter(currentCoordinates);
      map.setZoom(4);
      $("#map").css({ border: "3px solid orange" });
    }, 500);
  });

  changeRow[1].addEventListener("mouseenter", function () {
    this.parentNode.style.backgroundColor = "#d3d3d3";
  });

  changeRow[1].addEventListener("mouseleave", function () {
    clearTimeout(timeout);
    this.parentNode.style.backgroundColor = "initial";
    $("#map").css({ border: "initial" });
  });

  changeRow[2].addEventListener("mouseenter", function () {
    timeout = setTimeout(function () {
      map.setCenter(currentCoordinates);
      map.setStyle("mapbox://styles/mapbox/dark-v10");
      map.setZoom(6);
      $("#map").css({ border: "3px solid black" });
    }, 500);
  });

  changeRow[2].addEventListener("mouseenter", function () {
    this.parentNode.style.backgroundColor = "#d3d3d3";
  });

  changeRow[2].addEventListener("mouseleave", function () {
    clearTimeout(timeout);
    this.parentNode.style.backgroundColor = "initial";
    map.setStyle("mapbox://styles/mapbox/satellite-streets-v11");
    $("#map").css({ border: "initial" });
  });

  var removeBtn = document.createElement("BUTTON");
  removeBtn.textContent = "Remove";
  removeBtn.onclick = function () {
    if (changeRow[2].style.color == "green") {
      correctCount--;
    } else if (changeRow[2].style.fontStyle == "italic") {
      wrongCount--;
    }
    dbKey.update({ shown: false });

    if (document.getElementById("quizBody").rows.length == index) {
      index--;
    }
    // index--

    if (triggeredByClear) {
      clearArray.push(dbKey.key);
    } else {
      firebase
        .database()
        .ref("/history/" + historyPosition++)
        .set({
          actionKey: dbKey.key,
          type: "remove",
        });
    }

    newRow.parentNode.removeChild(newRow);
    document.getElementById("myFilter").onchange();
  };
  changeRow[2].appendChild(removeBtn);
}

function switchSelect(check) {
  let selection = document.getElementById("myFilter");
  let selectedValue = selection.options[selection.selectedIndex].value;
  if (
    (check && selectedValue == "Wrong") ||
    (!check && selectedValue == "Correct")
  ) {
    selection.selectedIndex = 0;
    selection.onchange();
  }
}

function updateCountry(countryPairs) {
  var quizRow = document.getElementById("quizRow");
  quizRow.deleteCell(0);
  var newCountry = quizRow.insertCell(0);
  newCountry.id = "pr2__country";
  newCountry.innerHTML = generateCountry(countryPairs);

  let currentCoordinates = findCoordinates(newCountry.innerHTML);
  map.setCenter(currentCoordinates);

  let timeout;
  newCountry.addEventListener("mouseenter", function () {
    timeout = setTimeout(function () {
      map.setStyle("mapbox://styles/mapbox/satellite-streets-v11");
      map.setCenter(currentCoordinates);
      map.setZoom(4);
      $("#map").css({ border: "3px solid orange" });
    }, 500);
  });

  newCountry.addEventListener("mouseenter", function () {
    this.parentNode.style.backgroundColor = "#d3d3d3";
  });

  newCountry.addEventListener("mouseleave", function () {
    clearTimeout(timeout);
    $("#map").css({ border: "initial" });
  });

  newCountry.addEventListener("mouseleave", function () {
    this.parentNode.style.backgroundColor = "initial";
  });
}

function generateCountry(countryPairs) {
  var randomPair =
    countryPairs[Math.floor(Math.random() * countryPairs.length)];
  var chosenCountry = randomPair["country"];
  return chosenCountry;
}

// This allows the Javascript code inside this block to only run when the page
// has finished loading in the browser.
$(document).ready(function () {
  fetch("https://cs374.s3.ap-northeast-2.amazonaws.com/country_capital_geo.csv")
    .then((response) => response.text())
    .then((csvString) => {
      window.pairs = [];
      window.coordinates = [];
      let rows = csvString.split("\n");
      for (stringRow of rows.slice(1)) {
        if (stringRow) {
          let row = stringRow.split(",");
          let countryPair = {
            country: row[0],
            capital: row[1],
          };
          let countryCoordinates = {
            country: row[0],
            coordinates: [row[2], row[3]],
          };
          window.pairs.push(countryPair);
          window.coordinates.push(countryCoordinates);
        }
      }

      countryPairs = window.pairs;

      // show past entries from database
      readFromDatabase();

      // list of capitals for autocomplete
      capitals = [];
      for (var i = 0; i < countryPairs.length; i++) {
        capitals.push(countryPairs[i]["capital"]);
      }

      // fill country in the associated cell
      var questionCountry = document.getElementById("pr2__country");
      questionCountry.innerHTML = generateCountry(countryPairs);

      // questionCountry.innerHTML
      map.setCenter(findCoordinates(questionCountry.innerHTML));

      let timeout;
      questionCountry.addEventListener("mouseenter", function () {
        timeout = setTimeout(function () {
          map.setCenter(findCoordinates(questionCountry.innerHTML));
          map.setZoom(4);
          $("#map").css({ border: "3px solid orange" });
        }, 500);
      });

      questionCountry.addEventListener("mouseenter", function () {
        this.parentNode.style.backgroundColor = "#d3d3d3";
      });

      questionCountry.addEventListener("mouseleave", function () {
        clearTimeout(timeout);
        $("#map").css({ border: "initial" });
      });

      questionCountry.addEventListener("mouseleave", function () {
        this.parentNode.style.backgroundColor = "initial";
      });

      // click button when 'Enter' is pressed
      var textField = document.getElementById("pr2__capital");
      textField.addEventListener("keyup", function (event) {
        if (event.code == "Enter") {
          event.preventDefault();
          document.getElementById("pr2__button").click();
        }
      });

      // action after clicking 'Check Answer' button
      var btn = document.getElementById("pr2__button");
      btn.onclick = function () {
        if (textField.value.length != 0) {
          // record the guess
          var countryAnswered =
            document.getElementById("pr2__country").innerHTML;
          var capitalAnswered = document
            .getElementById("pr2__capital")
            .value.toString()
            .trim();

          // search for country's true capital
          for (var i = 0; i < countryPairs.length; i++) {
            pair = countryPairs[i];
            if (pair["country"] === countryAnswered) {
              var correctCapital = pair["capital"];
            }
          }

          var shown = true;

          // check answer guess
          if (capitalAnswered.toLowerCase() === correctCapital.toLowerCase()) {
            var check = true;
            correctCount++;
          } else {
            var check = false;
            wrongCount++;
          }

          ++index;

          // save guess to firebase
          var dbKey = writeToDatabase(
            index,
            shown,
            check,
            correctCapital,
            countryAnswered,
            capitalAnswered,
            correctCount,
            wrongCount
          );

          // save 'add' action to firebase
          firebase
            .database()
            .ref("/history/" + historyPosition++)
            .set({
              actionKey: dbKey.key,
              type: "add",
            });

          updateCountry(countryPairs);

          textField.value = "";
          textField.focus();

          // hide "The list is empty" row
          var emptyRow = document.getElementById("emptyRow");
          emptyRow.style.display = "none";

          // add answer guess to the table
          var [newRow, changeRow] = addRow(-1);
          fillRow(
            check,
            changeRow,
            countryAnswered,
            correctCapital,
            capitalAnswered,
            dbKey,
            newRow
          );

          // switch to 'All' if correct guess on wrong select or vice-versa
          switchSelect(check);
        }
      };

      var clearBtn = document.getElementById("pr3__clear");
      clearBtn.onclick = function () {
        var body = document.getElementById("quizBody");
        var rows = body.getElementsByTagName("tr");
        var entriesN = rows.length - 2;

        if (entriesN == 0 && !triggeredByReset) {
          alert("No items to clear");
        } else {
          for (var i = 0; i < entriesN; i++) {
            let rmRow = rows[2];

            triggeredByClear = true;
            rmRow.getElementsByTagName("Button")[0].click();
          }

          firebase
            .database()
            .ref("/history/" + historyPosition++)
            .set({
              actionKey: clearArray,
              type: "clear",
            });

          index = 0;

          triggeredByClear = false;
          triggeredByReset = false;
        }

        document.getElementById("myFilter").onchange();
      };

      var undoBtn = document.getElementById("pr3__undo");
      undoBtn.onclick = function () {
        firebase
          .database()
          .ref("/history/")
          .get()
          .then((snapshot) => {
            var myValue = snapshot.val();
            if (myValue) {
              let keyList = Object.keys(myValue);
              let myKey = keyList[keyList.length - 1];
              let myItem = myValue[myKey];

              if (myItem.type == "add") {
                let body = document.getElementById("quizBody");
                let rows = body.getElementsByTagName("tr");

                rows[rows.length - 1].getElementsByTagName("Button")[0].click();
                firebase
                  .database()
                  .ref("/guesses/" + myItem.actionKey)
                  .remove();

                for (let i = 0; i < 2; i++) {
                  firebase
                    .database()
                    .ref("/history/" + --historyPosition)
                    .remove();
                }
              } else if (myItem.type == "remove") {
                firebase
                  .database()
                  .ref("/guesses/" + myItem.actionKey)
                  .get()
                  .then((snap) => {
                    if (snap.exists()) {
                      let removedKey = firebase
                        .database()
                        .ref("/guesses/" + myItem.actionKey);
                      let removedItem = snap.val();
                      let [newRow, changeRow] = addRow(removedItem.index + 2);

                      fillRow(
                        removedItem.check,
                        changeRow,
                        removedItem.country,
                        removedItem.correct,
                        removedItem.guess,
                        removedKey,
                        newRow
                      );
                      document.getElementById("myFilter").onchange();

                      removedKey.update({ shown: true });
                    }
                  });
                firebase
                  .database()
                  .ref("/history/" + --historyPosition)
                  .remove();
              } else if (myItem.type == "clear") {
                for (itemKey of myItem.actionKey) {
                  firebase
                    .database()
                    .ref("/guesses/" + itemKey)
                    .get()
                    .then((snap) => {
                      if (snap.exists()) {
                        let removedKey = firebase
                          .database()
                          .ref("/guesses/" + itemKey);
                        let removedItem = snap.val();
                        let [newRow, changeRow] = addRow(-1);

                        fillRow(
                          removedItem.check,
                          changeRow,
                          removedItem.country,
                          removedItem.correct,
                          removedItem.guess,
                          removedKey,
                          newRow
                        );
                        document.getElementById("myFilter").onchange();

                        removedKey.update({ shown: true });
                      }
                    });
                }
                firebase
                  .database()
                  .ref("/history/" + --historyPosition)
                  .remove();
              }
            } else {
              alert("Nothing to undo");
            }
          });
      };

      var resetBtn = document.getElementById("pr3__reset");
      resetBtn.onclick = function () {
        triggeredByReset = true;

        document.getElementById("pr3__clear").click();
        firebase.database().ref("/history/").remove();
        firebase.database().ref("/guesses/").remove();

        updateCountry(countryPairs);

        index = 0;
        historyPosition = 0;
      };

      // autocomplete
      $("#pr2__capital").autocomplete({
        source: function (request, response) {
          var term = $.ui.autocomplete.escapeRegex(request.term),
            startsWithMatcher = new RegExp("^" + term, "i"),
            startsWith = $.grep(capitals, function (value) {
              return startsWithMatcher.test(
                value.label || value.value || value
              );
            });
          response(startsWith);
        },
        select: function (event, ui) {
          document.getElementById("pr2__capital").value = ui.item.value;
          document.getElementById("pr2__button").click();
          $(this).val("");
          return false;
        },
        minLength: 2,
        autoFocus: true,
        maxHeight: 100,
      });
    });
});
