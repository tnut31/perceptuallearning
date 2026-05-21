create extension if not exists pgcrypto;

create table if not exists public.standards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  cluster text not null,
  grade_level text not null default '7',
  subject text not null default 'Math'
);

alter table public.standards enable row level security;

drop policy if exists "Standards are readable" on public.standards;
create policy "Standards are readable"
  on public.standards
  for select
  using (true);

insert into public.standards (code, description, cluster, grade_level, subject)
values
('KY.7.RP.1', 'Compute unit rates associated with ratios of fractions, including ratios of lengths, areas and other quantities measured in like or different units.', 'Analyze proportional relationships and use them to solve real-world and mathematical problems.', '7', 'Math')
on conflict (code) do update set
  description = excluded.description,
  cluster = excluded.cluster,
  grade_level = excluded.grade_level,
  subject = excluded.subject;

insert into public.standards (code, description, cluster, grade_level, subject) values
('KY.7.RP.2', 'Recognize and represent proportional relationships between quantities. a. Decide whether two quantities represent a proportional relationship. b. Identify the constant of proportionality (unit rate) in tables, graphs, equations, diagrams and verbal descriptions of proportional relationships. c. Represent proportional relationships by equations. d. Explain what a point (x, y) on the graph of a proportional relationship means in terms of the situation, with special attention to the points (0, 0) and (1, r) where r is the unit rate.', 'Analyze proportional relationships and use them to solve real-world and mathematical problems.', '7', 'Math')
on conflict (code) do update set description = excluded.description, cluster = excluded.cluster, grade_level = excluded.grade_level, subject = excluded.subject;

insert into public.standards (code, description, cluster, grade_level, subject) values
('KY.7.SP.0', 'Create displays, including circle graphs, scaled pictographs and bar graphs, to compare and analyze distributions of categorical data from both matching and different-sized samples.', 'Use random sampling to draw inferences about a population.', '7', 'Math'),
('KY.7.SP.1', 'Understand that statistics can be used to gain information about a population by examining a sample of the population.', 'Use random sampling to draw inferences about a population.', '7', 'Math'),
('KY.7.SP.2', 'Use data from a random sample to draw inferences about a population with an unknown characteristic of interest.', 'Use random sampling to draw inferences about a population.', '7', 'Math'),
('KY.7.SP.3', 'Describe the degree of visual overlap and separation from the graphical representations of two numerical data distributions.', 'Draw informal comparative inferences about two populations.', '7', 'Math'),
('KY.7.SP.4', 'Calculate and use measures of center and measures of variability for numerical data from random samples to draw informal comparative inferences about two populations.', 'Draw informal comparative inferences about two populations.', '7', 'Math'),
('KY.7.SP.5', 'Describe the probability of a chance event as a number between 0 and 1 that tells how likely the event is.', 'Investigate chance processes and develop, use and evaluate probability models.', '7', 'Math'),
('KY.7.SP.6', 'Approximate the probability of a chance event by collecting data on the chance process that produces it and observing its long-run relative frequency.', 'Investigate chance processes and develop, use and evaluate probability models.', '7', 'Math'),
('KY.7.SP.7', 'Develop a probability model and use it to find probabilities of events.', 'Investigate chance processes and develop, use and evaluate probability models.', '7', 'Math'),
('KY.7.SP.8', 'Find probabilities of compound events using organized lists, tables, tree diagrams and simulation.', 'Investigate chance processes and develop, use and evaluate probability models.', '7', 'Math')
on conflict (code) do update set description = excluded.description, cluster = excluded.cluster, grade_level = excluded.grade_level, subject = excluded.subject;

insert into public.standards (code, description, cluster, grade_level, subject) values
('KY.7.G.1', 'Solve problems involving scale drawings of geometric figures, including computing actual lengths and areas from a scale drawing and reproducing a scale drawing at a different scale.', 'Draw, construct and describe geometrical figures and describe the relationships between them.', '7', 'Math'),
('KY.7.G.2', 'Draw geometric shapes with given conditions using freehand, ruler and protractor, and technology.', 'Draw, construct and describe geometrical figures and describe the relationships between them.', '7', 'Math'),
('KY.7.G.3', 'Describe the two-dimensional figures that result from slicing three-dimensional figures.', 'Draw, construct and describe geometrical figures and describe the relationships between them.', '7', 'Math'),
('KY.7.G.4', 'Use formulas for area and circumference of circles and their relationships.', 'Solve real-life and mathematical problems involving angle measure, area, surface area and volume.', '7', 'Math'),
('KY.7.G.5', 'Apply properties of supplementary, complementary, vertical and adjacent angles in a multi-step problem to write and solve simple equations for an unknown angle in a figure.', 'Solve real-life and mathematical problems involving angle measure, area, surface area and volume.', '7', 'Math'),
('KY.7.G.6', 'Solve problems involving area of two-dimensional objects and surface area and volume of three-dimensional objects.', 'Solve real-life and mathematical problems involving angle measure, area, surface area and volume.', '7', 'Math')
on conflict (code) do update set description = excluded.description, cluster = excluded.cluster, grade_level = excluded.grade_level, subject = excluded.subject;

insert into public.standards (code, description, cluster, grade_level, subject) values
('KY.7.EE.1', 'Apply properties of operations as strategies to add, subtract, factor and expand linear expressions with rational coefficients.', 'Use properties of operations to generate equivalent expressions.', '7', 'Math'),
('KY.7.EE.2', 'Understand that rewriting an expression in different forms in a problem context can clarify the problem and how the quantities in it are related.', 'Use properties of operations to generate equivalent expressions.', '7', 'Math'),
('KY.7.EE.3', 'Solve real-life and mathematical problems posed with positive and negative rational numbers in any form, using tools strategically.', 'Solve real-life and mathematical problems using numerical and algebraic expressions and equations.', '7', 'Math'),
('KY.7.EE.4', 'Use variables to represent quantities in a real-world or mathematical problem and construct equations and inequalities to solve problems by reasoning about the quantities.', 'Solve real-life and mathematical problems using numerical and algebraic expressions and equations.', '7', 'Math')
on conflict (code) do update set description = excluded.description, cluster = excluded.cluster, grade_level = excluded.grade_level, subject = excluded.subject;

insert into public.standards (code, description, cluster, grade_level, subject) values
('KY.7.NS.1', 'Apply and extend previous understandings of addition and subtraction to add and subtract rational numbers; represent addition and subtraction on a horizontal or vertical number line diagram.', 'Apply and extend previous understandings of operations with fractions to add, subtract, multiply and divide rational numbers.', '7', 'Math'),
('KY.7.NS.2', 'Apply and extend previous understandings of multiplication and division and of fractions to multiply and divide rational numbers.', 'Apply and extend previous understandings of operations with fractions to add, subtract, multiply and divide rational numbers.', '7', 'Math'),
('KY.7.NS.3', 'Solve real-world and mathematical problems involving the four operations with rational numbers.', 'Apply and extend previous understandings of operations with fractions to add, subtract, multiply and divide rational numbers.', '7', 'Math')
on conflict (code) do update set description = excluded.description, cluster = excluded.cluster, grade_level = excluded.grade_level, subject = excluded.subject;

insert into public.standards (code, description, cluster, grade_level, subject) values
('KY.7.RP.3', 'Use percents to solve mathematical and real-world problems. a. Find a percent of a quantity as a rate per 100; solve problems involving finding the whole, a part and a percent, given two of these. b. Use proportional relationships to solve multistep ratio and percent problems.', 'Analyze proportional relationships and use them to solve real-world and mathematical problems.', '7', 'Math')
on conflict (code) do update set description = excluded.description, cluster = excluded.cluster, grade_level = excluded.grade_level, subject = excluded.subject;
