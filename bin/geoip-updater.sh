#!/bin/bash

set -e

if [[ $EUID -ne 0 ]]; then
   echo "Please run this script with a superuser..." 1>&2
   exit 1
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

mkdir -p $DIR/../api/node_modules/geoip-lite/data/temp
cd $DIR/../api/node_modules/geoip-lite/data/temp

wget http://geolite.maxmind.com/download/geoip/database/GeoIPCountryCSV.zip
wget http://geolite.maxmind.com/download/geoip/database/GeoLiteCity_CSV/GeoLiteCity-latest.zip
wget http://geolite.maxmind.com/download/geoip/database/GeoIPv6.csv.gz

unzip GeoIPCountryCSV.zip
unzip GeoLiteCity-latest.zip
gunzip GeoIPv6.csv.gz

cd GeoLiteCity_*
mv * ../
cd ../

echo "Creating geoip dat files..."
node $DIR/../api/node_modules/geoip-lite/lib/country-converter.js GeoIPCountryWhois.csv geoip-country.dat
node $DIR/../api/node_modules/geoip-lite/lib/country-converter.js GeoIPv6.csv geoip-country6.dat
node $DIR/../api/node_modules/geoip-lite/lib/city-converter.js GeoLiteCity-Blocks.csv geoip-city.dat

mv geoip-*.dat ../
cd ../
rm -rf temp

echo "Finished updating geoip data files. You need to restart api.js..."