(function(countlyLocation, $, undefined) {

	//Private Properties
	var _periodObj = {},
		_locationsDb = {},
		_chart,
		_dataTable,
		_chartElementId = "geo-chart",
		_chartOptions = {
			displayMode: 'region',
			colorAxis: {minValue: 0,  colors: ['#D7F1D8', '#6BB96E']},
			resolution: 'countries',
			toolTip: {textStyle: {color: '#FF0000'}, showColorCode: false},
			legend: "none",
			backgroundColor: "transparent",
			datalessRegionColor: "#FFF"
		};
		
	//Public Methods
	countlyLocation.initialize = function() {
		_periodObj = countlyCommon.periodObj;
	
		if (!countlyCommon.DEBUG) {
			return $.ajax({
				type: "GET",
				url: countlyCommon.READ_API_URL,
				data: {
					"app_key" : countlyCommon.ACTIVE_APP_KEY,
					"method" : "locations"
				},
				dataType: "jsonp",
				success: function(json) {
					_locationsDb = jQuery.parseJSON(json);
				}
			});
		} else {
			_locationsDb = {"2012": {}};
			return true;
		}
	};
	
	countlyLocation.drawGeoChart = function(options) {
		
		_periodObj = countlyCommon.periodObj;	
		
		if (options) {
			if (options.chartElementId) {
				_chartElementId = options.chartElementId;
			}
			
			if (options.height) {
				_chartOptions.height = options.height;
				
				//preserve the aspect ratio of the chart if height is given
				_chartOptions.width = (options.height * 556 / 347);
			}
		}
		
		if (google.visualization) {
			draw();
		} else {
			google.load('visualization', '1', {'packages': ['geochart'], callback : draw});
		}
	};
	
	countlyLocation.refreshGeoChart = function() {
		if (google.visualization) {
			reDraw();
		} else {
			google.load('visualization', '1', {'packages': ['geochart'], callback : draw});
		}
	}
	
	countlyLocation.getLocationData = function(options) {
		
		var locationData = countlyCommon.extractTwoLevelData(_locationsDb, _locationsDb["countries"], countlyLocation.clearLocationObject, [
			{
				"name":"country",
				"func": function(rangeArr, dataObj) {
					return countlyLocation.getCountryName(rangeArr);
				}
			}, 
			{
				"name":"code",
				"func": function(rangeArr, dataObj) {
					return rangeArr.toLowerCase();
				}
			},
			{ "name":"t" },
			{ "name":"u" },
			{ "name":"n" }
		]);
		
		if (options && options.maxCountries && locationData.chartData) {
			if (locationData.chartData.length > options.maxCountries) {
				locationData.chartData = locationData.chartData.splice(0, options.maxCountries);
			}
		}
		
		return locationData.chartData;
	}

	countlyLocation.clearLocationObject = function(obj) {
		if (obj) {
			if(!obj["t"]) obj["t"] = 0;
			if(!obj["n"]) obj["n"] = 0;
			if(!obj["u"]) obj["u"] = 0;
		}
		else {
			obj = {"t": 0, "n": 0, "u": 0};
		}
		
		return obj;
	}
	
	countlyLocation.getCountryName = function(cc) {
		switch (cc.toUpperCase()) {
			case "A1": cc = "Anonymous Proxy"; break;
			case "A2": cc = "Satellite Provider"; break;
			case "O1": cc = "Other Country"; break;
			case "AC": cc = "Ascension Island"; break;
			case "AD": cc = "Andorra"; break;
			case "AE": cc = "United Arab Emirates"; break;
			case "AF": cc = "Afghanistan"; break;
			case "AG": cc = "Antigua and Barbuda"; break;
			case "AI": cc = "Anguilla"; break;
			case "AL": cc = "Albania"; break;
			case "AM": cc = "Armenia"; break;
			case "AN": cc = "Netherlands Antilles"; break;
			case "AO": cc = "Angola"; break;
			case "AQ": cc = "Antarctica"; break;
			case "AR": cc = "Argentina"; break;
			case "AS": cc = "American Samoa"; break;
			case "AT": cc = "Austria"; break;
			case "AU": cc = "Australia"; break;
			case "AW": cc = "Aruba"; break;
			case "AZ": cc = "Azerbaijan"; break;
			case "BA": cc = "Bosnia and Herzegovina"; break;
			case "BB": cc = "Barbados"; break;
			case "BD": cc = "Bangladesh"; break;
			case "BE": cc = "Belgium"; break;
			case "BF": cc = "Burkina Faso"; break;
			case "BG": cc = "Bulgaria"; break;
			case "BH": cc = "Bahrain"; break;
			case "BI": cc = "Burundi"; break;
			case "BJ": cc = "Benin"; break;
			case "BM": cc = "Bermuda"; break;
			case "BN": cc = "Brunei"; break;
			case "BO": cc = "Bolivia"; break;
			case "BR": cc = "Brazil"; break;
			case "BS": cc = "Bahamas"; break;
			case "BT": cc = "Bhutan"; break;
			case "BV": cc = "Bouvet Island"; break;
			case "BW": cc = "Botswana"; break;
			case "BY": cc = "Belarus"; break;
			case "BZ": cc = "Belize"; break;
			case "CA": cc = "Canada"; break;
			case "CC": cc = "Cocos (Keeling) Islands"; break;
			case "CD": cc = "Congo, Democratic People's Republic"; break;
			case "CF": cc = "Central African Republic"; break;
			case "CG": cc = "Congo, Republic of"; break;
			case "CH": cc = "Switzerland"; break;
			case "CI": cc = "C&ocirc;te d'Ivoire"; break;
			case "CK": cc = "Cook Islands"; break;
			case "CL": cc = "Chile"; break;
			case "CM": cc = "Cameroon"; break;
			case "CN": cc = "China"; break;
			case "CO": cc = "Colombia"; break;
			case "CR": cc = "Costa Rica"; break;
			case "CU": cc = "Cuba"; break;
			case "CV": cc = "Cape Verde"; break;
			case "CX": cc = "Christmas Island"; break;
			case "CY": cc = "Cyprus"; break;
			case "CZ": cc = "Czech Republic"; break;
			case "DE": cc = "Germany"; break;
			case "DJ": cc = "Djibouti"; break;
			case "DK": cc = "Denmark"; break;
			case "DM": cc = "Dominica"; break;
			case "DO": cc = "Dominican Republic"; break;
			case "DZ": cc = "Algeria"; break;
			case "EC": cc = "Ecuador"; break;
			case "EE": cc = "Estonia"; break;
			case "EG": cc = "Egypt"; break;
			case "EH": cc = "Western Sahara"; break;
			case "ER": cc = "Eritrea"; break;
			case "ES": cc = "Spain"; break;
			case "ET": cc = "Ethiopia"; break;
			case "EU": cc = "European Union"; break;
			case "FI": cc = "Finland"; break;
			case "FJ": cc = "Fiji"; break;
			case "FK": cc = "Falkland Islands (Malvina)"; break;
			case "FM": cc = "Micronesia, Federal State of"; break;
			case "FO": cc = "Faroe Islands"; break;
			case "FR": cc = "France"; break;
			case "GA": cc = "Gabon"; break;
			case "GB": cc = "United Kingdom"; break;
			case "GD": cc = "Grenada"; break;
			case "GE": cc = "Georgia"; break;
			case "GF": cc = "French Guiana"; break;
			case "GG": cc = "Guernsey"; break;
			case "GH": cc = "Ghana"; break;
			case "GI": cc = "Gibraltar"; break;
			case "GL": cc = "Greenland"; break;
			case "GM": cc = "Gambia"; break;
			case "GN": cc = "Guinea"; break;
			case "GP": cc = "Guadeloupe"; break;
			case "GQ": cc = "Equatorial Guinea"; break;
			case "GR": cc = "Greece"; break;
			case "GS": cc = "South Georgia and the South Sandwich Islands"; break;
			case "GT": cc = "Guatemala"; break;
			case "GU": cc = "Guam"; break;
			case "GW": cc = "Guinea-Bissau"; break;
			case "GY": cc = "Guyana"; break;
			case "HK": cc = "Hong Kong"; break;
			case "HM": cc = "Heard and McDonald Islands"; break;
			case "HN": cc = "Honduras"; break;
			case "HR": cc = "Croatia/Hrvatska"; break;
			case "HT": cc = "Haiti"; break;
			case "HU": cc = "Hungary"; break;
			case "ID": cc = "Indonesia"; break;
			case "IE": cc = "Ireland"; break;
			case "IL": cc = "Israel"; break;
			case "IM": cc = "Isle of Man"; break;
			case "IN": cc = "India"; break;
			case "IO": cc = "British Indian Ocean Territory"; break;
			case "IQ": cc = "Iraq"; break;
			case "IR": cc = "Iran"; break;
			case "IS": cc = "Iceland"; break;
			case "IT": cc = "Italy"; break;
			case "JE": cc = "Jersey"; break;
			case "JM": cc = "Jamaica"; break;
			case "JO": cc = "Jordan"; break;
			case "JP": cc = "Japan"; break;
			case "KE": cc = "Kenya"; break;
			case "KG": cc = "Kyrgyzstan"; break;
			case "KH": cc = "Cambodia"; break;
			case "KI": cc = "Kiribati"; break;
			case "KM": cc = "Comoros"; break;
			case "KN": cc = "Saint Kitts and Nevis"; break;
			case "KP": cc = "North Korea"; break;
			case "KR": cc = "South Korea"; break;
			case "KW": cc = "Kuwait"; break;
			case "KY": cc = "Cayman Islands"; break;
			case "KZ": cc = "Kazakstan"; break;
			case "LA": cc = "Laos"; break;
			case "LB": cc = "Lebanon"; break;
			case "LC": cc = "Saint Lucia"; break;
			case "LI": cc = "Liechtenstein"; break;
			case "LK": cc = "Sri Lanka"; break;
			case "LR": cc = "Liberia"; break;
			case "LS": cc = "Lesotho"; break;
			case "LT": cc = "Lithuania"; break;
			case "LU": cc = "Luxembourg"; break;
			case "LV": cc = "Latvia"; break;
			case "LY": cc = "Lybia"; break;
			case "MA": cc = "Morocco"; break;
			case "MC": cc = "Monaco"; break;
			case "MD": cc = "Moldova"; break;
			case "MG": cc = "Madagascar"; break;
			case "MH": cc = "Marshall Islands"; break;
			case "MK": cc = "Macedonia, Former Yugoslav Republic"; break;
			case "ML": cc = "Mali"; break;
			case "MM": cc = "Myanmar"; break;
			case "MN": cc = "Mongolia"; break;
			case "MO": cc = "Macau"; break;
			case "MP": cc = "Northern Mariana Islands"; break;
			case "MQ": cc = "Martinique"; break;
			case "MR": cc = "Mauritania"; break;
			case "MS": cc = "Montserrat"; break;
			case "MT": cc = "Malta"; break;
			case "MU": cc = "Mauritius"; break;
			case "MV": cc = "Maldives"; break;
			case "MW": cc = "Malawi"; break;
			case "MX": cc = "Mexico"; break;
			case "MY": cc = "Maylaysia"; break;
			case "MZ": cc = "Mozambique"; break;
			case "NA": cc = "Namibia"; break;
			case "NC": cc = "New Caledonia"; break;
			case "NE": cc = "Niger"; break;
			case "NF": cc = "Norfolk Island"; break;
			case "NG": cc = "Nigeria"; break;
			case "NI": cc = "Nicaragua"; break;
			case "NL": cc = "Netherlands"; break;
			case "NO": cc = "Norway"; break;
			case "NP": cc = "Nepal"; break;
			case "NR": cc = "Nauru"; break;
			case "NU": cc = "Niue"; break;
			case "NZ": cc = "New Zealand"; break;
			case "OM": cc = "Oman"; break;
			case "PA": cc = "Panama"; break;
			case "PE": cc = "Peru"; break;
			case "PF": cc = "French Polynesia"; break;
			case "PG": cc = "Papua New Guinea"; break;
			case "PH": cc = "Philippines"; break;
			case "PK": cc = "Pakistan"; break;
			case "PL": cc = "Poland"; break;
			case "PM": cc = "St. Pierre and Miquelon"; break;
			case "PN": cc = "Pitcairn Island"; break;
			case "PR": cc = "Puerto Rico"; break;
			case "PS": cc = "Palestinian Territories"; break;
			case "PT": cc = "Portugal"; break;
			case "PW": cc = "Palau"; break;
			case "PY": cc = "Paraguay"; break;
			case "QA": cc = "Qatar"; break;
			case "RE": cc = "Reunion"; break;
			case "RO": cc = "Romania"; break;
			case "RU": cc = "Russia"; break;
			case "RW": cc = "Twanda"; break;
			case "SA": cc = "Saudi Arabia"; break;
			case "SB": cc = "Solomon Islands"; break;
			case "SC": cc = "Seychelles"; break;
			case "SU": cc = "Sudan"; break;
			case "SE": cc = "Sweden"; break;
			case "SG": cc = "Singapore"; break;
			case "SH": cc = "St. Helena"; break;
			case "SI": cc = "Slovenia"; break;
			case "SJ": cc = "Svalbard and Jan Mayan Islands"; break;
			case "SK": cc = "Slovakia"; break;
			case "SL": cc = "Sierra Leone"; break;
			case "SM": cc = "San Marino"; break;
			case "SN": cc = "Senegal"; break;
			case "SO": cc = "Somalia"; break;
			case "SR": cc = "Suriname"; break;
			case "ST": cc = "S&atilde;o Tome and Principe"; break;
			case "SV": cc = "El Salvador"; break;
			case "SY": cc = "Syria"; break;
			case "SZ": cc = "Swaziland"; break;
			case "TC": cc = "Turks and Ciacos Islands"; break;
			case "TD": cc = "Chad"; break;
			case "TF": cc = "French Southern Territories"; break;
			case "TG": cc = "Togo"; break;
			case "TH": cc = "Thailand"; break;
			case "TJ": cc = "Tajikistan"; break;
			case "TK": cc = "Tokelau"; break;
			case "TM": cc = "Turkmenistan"; break;
			case "TN": cc = "Tunisia"; break;
			case "TO": cc = "Tonga"; break;
			case "TP": cc = "East Timor"; break;
			case "TR": cc = "Turkey"; break;
			case "TT": cc = "Trinidad and Tobago"; break;
			case "TV": cc = "Tuvalu"; break;
			case "TW": cc = "Taiwan"; break;
			case "TZ": cc = "Tanzania"; break;
			case "UA": cc = "Ukraine"; break;
			case "UG": cc = "Uganda"; break;
			case "UK": cc = "United Kingdom"; break;
			case "UM": cc = "US Minor Outlying Islands"; break;
			case "US": cc = "USA"; break;
			case "UY": cc = "Uruguay"; break;
			case "UZ": cc = "Uzbekistan"; break;
			case "VA": cc = "Vatican City"; break;
			case "VC": cc = "Saint Vincent and the Grenadines"; break;
			case "VE": cc = "Venezuela"; break;
			case "VG": cc = "British Virgin Islands"; break;
			case "VI": cc = "US Virgin Islands"; break;
			case "VN": cc = "Vietnam"; break;
			case "VU": cc = "Vanuatu"; break;
			case "WF": cc = "Wallis and Futuna Islands"; break;
			case "WS": cc = "Western Samoa"; break;
			case "YE": cc = "Yemen"; break;
			case "YT": cc = "Mayotte"; break;
			case "YU": cc = "Yugoslavia"; break;
			case "ZA": cc = "South Africa"; break;
			case "ZM": cc = "Zambia"; break;
			case "ZR": cc = "Zaire"; break;
			case "ZW": cc = "Zimbabwe"; break;
			default:   cc = "Unknown";
		}
		
		return cc;
	}
	
	//Private Methods
	function draw() {	
		var chartData = {cols: [], rows: []};
		
		_chart = new google.visualization.GeoChart(document.getElementById(_chartElementId));
				
		var tt = countlyCommon.extractTwoLevelData(_locationsDb, _locationsDb["countries"], countlyLocation.clearLocationObject, [
			{
				"name":"country",
				"func": function(rangeArr, dataObj) {
					return countlyLocation.getCountryName(rangeArr);
				}
			},
			{ "name":"t" }
		]);
		
		chartData.cols = [{id: 'country', label: 'Country', type: 'string'}, {id: 'total', label: 'Total', type: 'number'}];
		chartData.rows = _.map(tt.chartData, function(value, key, list){
			if (value.country == "European Union" || value.country == "Unknown") {
				return {c: [{v: ""}, {v: value["t"]}]};
			}
			return {c: [{v: value.country}, {v: value["t"]}]};
		});
		
		_dataTable = new google.visualization.DataTable(chartData);

		_chartOptions['region'] = "world"; 
		_chartOptions['resolution'] = 'countries';
		_chartOptions["displayMode"] = "region";
		
		_chart.draw(_dataTable, _chartOptions); 
	}
	
	function reDraw() {
		var chartData = {cols: [], rows: []};
		
		var tt = countlyCommon.extractTwoLevelData(_locationsDb, _locationsDb["countries"], countlyLocation.clearLocationObject, [
			{
				"name":"country",
				"func": function(rangeArr, dataObj) {
					return countlyLocation.getCountryName(rangeArr);
				}
			},
			{ "name":"t" }
		]);
		
		chartData.cols = [{id: 'country', label: 'Country', type: 'string'}, {id: 'total', label: 'Total', type: 'number'}];
		chartData.rows = _.map(tt.chartData, function(value, key, list){
			if (value.country == "European Union" || value.country == "Unknown") {
				return {c: [{v: ""}, {v: value["t"]}]};
			}
			return {c: [{v: value.country}, {v: value["t"]}]};
		});
		
		_dataTable = new google.visualization.DataTable(chartData);
		_chart.draw(_dataTable, _chartOptions);
	}
	
	function geoDataSortHelper(a, b){
	  return ((a["t"] > b["t"]) ? -1 : ((a["t"] < b["t"]) ? 1 : 0));
	}

}(window.countlyLocation = window.countlyLocation || {}, jQuery));