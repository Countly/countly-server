# addressparser

Parse e-mail address fields

## Installation

Install with npm

    npm install addressparser

## Usage

Include the module

    var addressparser = require("addressparser");

Parse some address strings with addressparser(field)

    var addresses = addressparser("andris <andris@tr.ee>");
    console.log(addresses); // [{name: "andris", address:"andris@tr.ee"}]

Even complex address fields are supported

    addressparser('"Bach, Sebastian" <sebu@example.com>, mozart@example.com (Mozzie)');
    // [{name: "Bach, Sebastian", address: "sebu@example.com"},
    //  {name: "Mozzie", address: "mozart@example.com"}]

    addressparser("Music Group: sebu@example.com, mozart@example.com;");
    // [{name: "Music Group", address: "sebu@example.com"},
    //  {name: "Music Group", address: "mozart@example.com"}]

## Notes

  * **NB!** this module does not decode any mime-word or punycode encoded strings, it is only a basic parser for parsing the base data, you need to decode the encoded parts later by yourself

## License

**MIT**