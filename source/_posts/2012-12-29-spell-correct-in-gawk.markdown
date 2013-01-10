---
layout: post
title: "Spell Correct in GNU AWK"
date: 2012-12-29 03:17
comments: true
description: A small spell correct written in awk with only 15 lines inspired in Peter Norvig's Spell Correct
categories: 
 - Open Source
 - Algorithm
 - Awk
---

Based on [Peter Norvig Spell Correct](http://norvig.com/spell-correct.html)

{% gist 4404742 %}

This is my version of the Norvig's Spell Corrector in gnu awk. 

Follow the code we can find 2 functions and 3 blocks of code. Awk is a oriented to data flow, I'm always reading something, in this case I read a huge file (big.txt) with many words. It is a good sample of word frequency distributions, the most common words should be present in more number than rare words.

<!-- more -->

I can read and store the frequency of the word using this:

	{  ++NWORDS[tolower($1)]   }
	
it is a map between the word (in lowercase) and how many times I can find in the text.

But, how I can read one word per time? In awk, $1 is the first field in one register. When I read one text, awk consider each line as a register and each work as a field and I can change this with the Record Separator (RS, new line by default) and Field Separator (FS, one or more space/tabs by default) variables.

I'm using the BEGIN block to setup the script:

	BEGIN{ if (ARGC == 1) ARGV[ARGC++] = "big.txt" # http://norvig.com/big.txt
       	while(++i<=length(x="abcdefghijklmnopqrstuvwxyz")) alpha[i]=substr(x,i,1)
       	IGNORECASE=RS="[^"x"]+" }

First, if there is no arguments, I add the big.txt to read and store in 'NWORDS'.

Second, I create an array 'alpha' with each letter. I'm using the temporary variable x to store the valid sequence of words and change the value of RS to a regular expression who match one (or more) non alpha chars. In awk, string concatenation is very simple:

	RS = "[^" x "]+"
is equivalent to	
	RS = "[^abcdefghijklmnopqrstuvwxyz]+"

The variable IGNORECASE, with a non 0 value, change the behavior of regular expressions.

After setup the script and read big.txt (or other file(s)) and create NWORDS map, we execute the END block:

	END{   print (word in NWORDS) ? word : "correct("word")=> " correct(tolower(word)) }
	
What is 'word'? To run this script we pass this variable directly to the script using -v option. 

	gawk -v word=some_word_to_verify -f spelling.awk 	
	
If this word has no problems I can find in NWORDS, but if i can't find, I call the 'correct' function.

	function correct(word            ,candidates,i,list,max,temp){
       edits(word,length(word),candidates,list)
       if (!asort(candidates,temp)) for(i in list) edits(i,length(i),candidates)
       return (max = asorti(candidates)) ? candidates[max] : word }

All variables in awk are globals. To create local variables we add in the function signature. It is ugly but it is the only way, and the convention is separate the local variables with many spaces (in this case: candidates, i, list, max and temp).

The function correct call edits and return a unique list with possible correct words OR I call edits again with each 'candidate'. The asort is a portable way to return the size of the array/map and I do not change the original (i use temp). asorti order a map by the value of his indexes to find the maximum value. In this case, max is the size of the array and the last element is the most common word in the map (candidates[max]).

and here is the magic of edits:

	function edits(w,max,candidates,list,        i,j){
       for(i=0;i<  max ;++i) ++list[substr(w,0,i) substr(w,i+2)] # deletes
       for(i=0;i< max-1;++i) ++list[substr(w,0,i) substr(w,i+2,1) substr(w,i+1,1) substr(w,i+3)] # transposes
       for(i=0;i<  max ;++i) for(j in alpha) ++list[substr(w,0,i) alpha[j] substr(w,i+2)] # replaces
       for(i=0;i<= max ;++i) for(j in alpha) ++list[substr(w,0,i) alpha[j] substr(w,i+1)] # inserts
       for(i in list) if(i in NWORDS) candidates[i] = NWORDS[i] }

I'm using w as a mnemonic of word to reduce the size of each statement, specialty in 'transposes'. Here we get the word and try to apply 4 types of operations: deletes, transposes, replaces and inserts (see the [original article](http://norvig.com/spell-correct.html) ). If we find, we add copy the value from NWORDS to candidates.

The idea is simple: if I apply all four operations and find one or more candidates in NWORDS, the most probably word will be the most present word in big.txt - CQD.

Example:

	$ time gawk -v word=reciet -f spelling.awk 
	correct(reciet)=> recite

	real 0m4.450s
	user 0m4.351s
	sys 0m0.027s

Thanks for your time. 