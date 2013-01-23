---
layout: post
title: "Schwartzian transform"
date: 2013-01-22 16:00
comments: true
categories: Ruby, Perl
---

I will show in this post one of the most useful things that I learn in Perl: the famous Schwartzian transform. With examples in Ruby

{% blockquote Wikipedia http://en.wikipedia.org/wiki/Schwartzian_transform %}

In computer science, the Schwartzian transform is a Perl programming idiom used to improve the efficiency of sorting a list of items. This idiom is appropriate for comparison-based sorting when the ordering is actually based on the ordering of a certain property (the key) of the elements, where computing that property is an intensive operation that should be performed a minimal number of times. The Schwartzian Transform is notable in that it does not use named temporary arrays.

{% endblockquote %}

<!-- more -->
``` ruby
array = 1..5

def foo(x)
    # some expensive calculation...
	x.to_s
end	

array.sort { |a,b| foo(a) <=> foo(b) }
```

In this example, foo are called 12 times. With +5 more elements in this array we jump to 52 calls. If foo is very expensive it is a waste of cpu. What we can do? Memoize is an option but I need to add an extra gem in my project. The solution is... Schwartzian transform!

``` ruby
array = 1..5

def foo(x)
    # some expensive calculation...
	x.to_s
end	

array.map{ |original| 
	[original, foo(original)]  # add the original and pre-calculated value
}.sort { |a,b| 
	a.last <=> b.last          # perform comparation
}.map{|x|
	x.first                    # extract the original, drop the pre-calculated value
}
```

In this case we use the double of memory (to store the original and foo(original)) but we call foo only 5 times.

We can use this pattern to solve other problems, sort is just one of them. Every time when we have one expensive calculation and we call this many times, maybe we can solve using this technique.

Now, look at this code:

``` ruby
array = 1..5

def foo(x)
    # some expensive calculation...
	x.to_s
end	

array.sort_by{|x| foo(x) }
```

Using sort_by we can use the power of Schwartzian transform for many cases if our sort is based on a simple comparation.

The original version, in perl

``` perl
@sorted = map  { $_->[0] }
          sort { $a->[1] cmp $b->[1] }
          map  { [$_, foo($_)] }
               @unsorted;
``` 

Other languagens has some kind of support like [D](http://dlang.org/) 2.0, with schwartzSort function. You can find an example in PHP [Here](http://gregheo.com/blog/php/schwartzian-transform/).