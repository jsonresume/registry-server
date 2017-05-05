#!/bin/bash

function echo_heading {
  local string=$1
  local string_length=${#string}

  local underline=""
  for ((i=1;i<=string_length;i++)) ; do
    underline=${underline}-
  done

  echo -e "\n$string"
  echo $underline
}
