---
layout: post
title: "MooseX - a new Ruby DSL for Object Oriented Programming (and much more)"
date: 2014-02-07 20:13
comments: true
categories: [ Ruby, MooseX, AOP ]
---

# MooseX

A postmodern object DSL for Ruby [![Build Status](https://travis-ci.org/peczenyj/MooseX.png)](https://travis-ci.org/peczenyj/MooseX) [![Gem Version](https://badge.fury.io/rb/moosex.png)](http://badge.fury.io/rb/moosex)

## Introduction

This is another DSL for object creation, aspects, method delegation and much more. It is based on Perl Moose and Moo, two important modules who add a better way of Object Orientation development (and I enjoy A LOT). Using a declarative stype, using Moose/Moo you can create attributes, methods, the entire constructor and much more. But I can't find something similar in Ruby world, so I decide port a small subset of Moose to create a powerfull DSL for object construction.

Of course, there is few similar projects in ruby like 

- [Virtus](https://github.com/solnic/virtus)
- [Active Record Validations](http://edgeguides.rubyonrails.org/active_record_validations.html)

But the objetive of MooseX is different: this is a toolbox to create Classes based on DSL, with unique features like

- method delegation ( see 'handles')
- lazy attributes
- roles
- parameterized roles
- composable type check
- events

and much more.

This rubygem is based on this modules:

- [Perl Moose](http://search.cpan.org/~ether/Moose-2.1204/lib/Moose.pm)
- [Perl Moo](http://search.cpan.org/~ether/Moose-2.1204/lib/Moose.pm)
- [MooX::Types::MooseLike::Base](http://search.cpan.org/~mateu/MooX-Types-MooseLike-0.25/lib/MooX/Types/MooseLike/Base.pm)
- [MooseX::Event](http://search.cpan.org/~winter/MooseX-Event-v0.2.0/lib/MooseX/Event.pm)
- [MooseX::Role::Parameterized](http://search.cpan.org/~sartak/MooseX-Role-Parameterized-1.02/lib/MooseX/Role/Parameterized/Tutorial.pod)

See also:

- [Joose](https://code.google.com/p/joose-js/), a javascript port of Moose.
- [Perl 6](http://en.wikipedia.org/wiki/Perl_6#Object-oriented_programming) Perl 6 OO programming style.

Why MooseX? Because the namespace MooseX/MooX is open to third-party projects/plugins/extensions. You can upgrade your Moo(se) class using other components if you want. And there is one gem called 'moose' :/

THIS MODULE IS EXPERIMENTAL YET! BE CAREFUL!

Talk is cheap. Show me the code!

```ruby
require 'moosex'

class Point
  include MooseX

  has x: {
    is: :rw,      # read-write (mandatory)
    isa: Integer, # should be Integer
    default: 0,   # default value is 0 (constant)
  }

  has y: {
    is: :rw,
    isa: Integer,
    default: lambda { 0 }, # you should specify a lambda
  }

  def clear! 
    self.x= 0     # to run with type-check you must
    self.y= 0     # use the setter instad @x=
  end
end 

# now you have a generic constructor
p1  = Point.new                       # x and y will be 0
p2  = Point.new( x:  5 )              # y will be 0
p3  = Point.new( x:  5, y: 4)
```
   
<!-- more -->
    
## Installation

Add this line to your application's Gemfile:

    gem 'moosex'

And then execute:

    $ bundle

Or install it yourself as:

    $ gem install moosex

You need ruby 2.0.x or superior.

## Description

MooseX is an extension of Ruby object system. The main goal of MooseX is to make Ruby Object Oriented programming easier, more consistent, and less tedious. With MooseX you can think more about what you want to do and less about the mechanics of OOP. It is a port of Moose/Moo from Perl to Ruby world.

Read more about Moose on http://moose.iinteractive.com/en/

## Motivation

It is fun

## Usage

You just need include the MooseX module in your class and start to describe the attributes with our DSL. This module will inject one smart constructor, acessor and other necessary methods.

Instead the normal way of add accessors, constructor, validation, etc

```ruby
class Foo
  attr_accessor :bar, :baz, :bam

  def initialize(bar=0, baz=0, bam=0)
    unless [bar, baz, bam].all? {|x| x.is_a? Integer }
      raise "you should use only Integers to build Foo"
    end
    @bar = bar
    @baz = baz
    @bam = bam
  end
end
```
you can do this:

```ruby
class Foo
  include MooseX

  has [:bar, :baz, :bam], {
    is: :rw,
    isa: Integer,
    default: 0
  }
end
``` 

## Contributing

1. Fork it ( http://github.com/peczenyj/MooseX/fork )
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request Push to the branch (`git push origin my-new-feature`)