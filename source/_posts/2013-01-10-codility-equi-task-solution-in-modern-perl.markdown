---
layout: post
title: "Codility Equi Task Solution in Modern Perl"
date: 2013-01-10 12:32
comments: true
categories: 
---

[Codility](http://codility.com) is one of the most common services used to apply test codes (for job applications, for example). [Here](http://codility.com/demo/take-sample-test/) you can find a task sample to pratice before try the real test. The present sample is the [Equi Task](http://blog.codility.com/2011/03/solutions-for-task-equi.html), and the propose is very simple.

Imagine an array with N elements. There is a P value (0 <= P <= N) who solve the problem below?

	A[0] + A[1] + ... + A[P−1] = A[P+1] + ... + A[N−2] + A[N−1].
	
In other words, where is the equilibrium index of this array?

For example, consider the following array A consisting of N = 7 elements:
	A[0] = -7   A[1] =  1   A[2] = 5
	A[3] =  2   A[4] = -4   A[5] = 3
	A[6] =  0
	
P = 3 is an equilibrium index of this array, because:

	A[0] + A[1] + A[2] = A[4] + A[5] + A[6]

The task is build one subroutine called equi who will receive the array should return the value of P, or -1 if there is no equilibrium index.

Easy? Well, there is another challenge: create a O(n) solution.

Here is my solution in Perl:
<!-- more -->
{% gist 4502025 %}

Using Perl 5.10 or superior, you can run the code and see the result

<pre>
1..4
ok 1 - example
ok 2 - simple
ok 3 - trivial
ok 4 - single
</pre>

I'm using two new features: the defined-or operator and state variables.

The defined-or is like a regular logic or BUT consider only undefined values as 'false'. Instead doing this:

	(defined $p)? $p : -1

you can do only

	$p // -1
	
0 is a valid value for P, but 0 is false for boolean operations. For example, te code below fails:

	$p || -1
	
the test 'single', where I have only one element.

The List::Util first subroutine is similar to grep, we can pass a block and an array, and we evaluate the block for each element of the array until the block returns a true value, then stops. If I can't find anything, the subroutine return undef.

Another feature is the state variable. Instead do this

	my $pivot = 0;
	my $p = first { ... ; $pivot  = $A[$_]; ... }
	
We just declare the state variable

	my $pivot = 0;
	my $p = first { state $pivot = 0; ... ; $pivot  = $A[$_]; ... }
	
In this case, $pivot is a state variable. The keyword state declares a lexically scoped variable, just like my. However, those variables will never be reinitialized, contrary to lexical variables that are reinitialized each time their enclosing block is entered.

And sum returns the sum of all elements of this array.

{% img /images/codility.png %}

I think now is easy to read and understand the code. Perl is not difficult to read, we just need practice.	